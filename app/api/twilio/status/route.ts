import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs, billingLedger, usageRecords, orgMembers } from "@/shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { calculateDeploymentAwareCost, calculateCallCost } from "@/lib/billing";
import { deductFromWallet } from "@/lib/wallet";
import { roundMoney } from "@/lib/money";
import { generateCallSummary } from "@/lib/ai";
import { validateTwilioSignature } from "@/lib/twilio";
import { calculateBasicQuality, scoreCallQualityAI } from "@/lib/call-quality";
import { dispatchWebhook } from "@/lib/webhook-dispatcher";
import { createNotification } from "@/lib/notifications";
import { redactForDisplay } from "@/lib/pii-redaction";
import type { UsageCategory } from "@/lib/rate-resolver";

function getWebhookUrl(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host") || "";
  return `${proto}://${host}${new URL(request.url).pathname}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const callDuration = formData.get("CallDuration") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingSid = formData.get("RecordingSid") as string;

    if (!callSid) {
      return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });
    }

    const [callLog] = await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.twilioCallSid, callSid))
      .limit(1);

    if (!callLog) {
      console.warn(`[Twilio Status] No call log found for SID: ${callSid}`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const signature = request.headers.get("x-twilio-signature") || "";
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });
    const webhookUrl = getWebhookUrl(request);
    if (!await validateTwilioSignature(webhookUrl, params, signature, callLog.orgId)) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    if (callLog.status === "completed" || callLog.status === "failed" || callLog.status === "canceled") {
      console.info(`[Twilio Status] Call ${callLog.id} already finalized (${callLog.status}), skipping duplicate callback`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const updates: Record<string, unknown> = {};

    if (recordingUrl) {
      updates.recordingUrl = recordingUrl + ".mp3";
      updates.recordingSid = recordingSid;
    }

    if (callStatus === "completed" || callStatus === "no-answer" || callStatus === "busy" || callStatus === "failed" || callStatus === "canceled") {
      updates.status = callStatus === "completed" ? "completed" : callStatus;
      updates.endedAt = new Date();

      if (callDuration) {
        const durationSeconds = parseInt(callDuration, 10);
        updates.duration = durationSeconds;

        if (durationSeconds > 0 && callStatus === "completed") {
          const connectedAt = callLog.connectedAt || callLog.startedAt;
          const endedAt = new Date();
          const category: UsageCategory = callLog.direction === "outbound" ? "voice_outbound" : "voice_inbound";

          let billing: Awaited<ReturnType<typeof calculateDeploymentAwareCost>>;
          const capturedRate = callLog.billedRatePerMinute ? parseFloat(String(callLog.billedRatePerMinute)) : null;
          if (capturedRate !== null && capturedRate > 0) {
            const base = calculateCallCost(connectedAt, endedAt, capturedRate);
            billing = {
              ...base,
              deploymentModel: (callLog.billedDeploymentModel || "managed") as any,
              ratePerMinute: capturedRate,
              platformFeePerMinute: 0,
              includesAiCost: callLog.billedDeploymentModel === "managed",
              includesTelephonyCost: callLog.billedDeploymentModel === "managed",
            };
          } else {
            billing = await calculateDeploymentAwareCost(callLog.orgId, connectedAt, endedAt, category);
          }
          const { cost, billableSeconds, ratePerMinute } = billing;
          updates.callCost = String(cost);

          if (cost > 0) {
            let walletDeducted = false;
            try {
              await deductFromWallet(
                callLog.orgId,
                cost,
                `Call charge: ${Math.ceil(billableSeconds / 60)} min (${callLog.direction}, ${billing.deploymentModel})`,
                "call",
                `call-${callLog.id}`
              );
              walletDeducted = true;
            } catch (walletErr) {
              console.error(`[Twilio Status] Wallet deduction failed for call ${callLog.id}:`, walletErr);
            }

            if (walletDeducted) {
              try {
                await db.insert(billingLedger).values({
                  orgId: callLog.orgId,
                  callLogId: callLog.id,
                  providerCallId: callSid,
                  startedAt: callLog.startedAt,
                  connectedAt: callLog.connectedAt || callLog.startedAt,
                  endedAt: new Date(),
                  billableSeconds,
                  ratePerMinute: String(ratePerMinute),
                  cost: String(cost),
                  provider: "twilio",
                  status: "billed",
                }).onConflictDoNothing();
              } catch (ledgerErr) {
                console.error(`[Twilio Status] Billing ledger entry failed for call ${callLog.id}:`, ledgerErr);
              }

              try {
                const now = new Date();
                const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                const minutesUsed = roundMoney(billableSeconds / 60);
                await db.execute(sql`
                  INSERT INTO usage_records (user_id, org_id, month, minutes_used, call_count)
                  VALUES (${callLog.userId}, ${callLog.orgId}, ${month}, ${minutesUsed}, 1)
                  ON CONFLICT (org_id, month, user_id) DO UPDATE
                  SET minutes_used = usage_records.minutes_used + ${minutesUsed},
                      call_count = usage_records.call_count + 1
                `);
              } catch (usageErr) {
                console.error(`[Twilio Status] Usage record update failed for call ${callLog.id}:`, usageErr);
              }
            }
          }

          if (callLog.transcript && callLog.transcript.length > 50) {
            try {
              const leadMatch = callLog.transcript.match(/(?:name|my name is|I'm|I am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
              const emailMatch = callLog.transcript.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
              const phoneMatch = callLog.transcript.match(/\+?[\d\s\-().]{10,}/);

              if (leadMatch || emailMatch || phoneMatch) {
                updates.leadCaptured = true;
                if (leadMatch) updates.leadName = leadMatch[1];
                if (emailMatch) updates.leadEmail = emailMatch[0];
                if (phoneMatch) updates.leadPhone = phoneMatch[0]?.trim();
              }

              const redactedTranscript = redactForDisplay(callLog.transcript);
              updates.transcript = redactedTranscript;

              const summary = await generateCallSummary(redactedTranscript, callLog.orgId);
              updates.summary = summary;
            } catch (summaryErr) {
              console.error(`[Twilio Status] Summary generation failed for call ${callLog.id}:`, summaryErr);
            }
          }

          try {
            let qualityResult;
            const transcriptForScoring = (updates.transcript as string) || callLog.transcript;
            if (transcriptForScoring && transcriptForScoring.length > 100) {
              qualityResult = await scoreCallQualityAI(transcriptForScoring, "AI Agent", callLog.orgId);
            } else {
              qualityResult = calculateBasicQuality(
                callLog.turnCount || 0,
                15,
                Number(callLog.sentimentScore),
                callLog.handoffTriggered || false,
                callLog.finalOutcome || null,
                durationSeconds
              );
            }
            updates.qualityScore = String(qualityResult.overallScore);
            updates.qualityBreakdown = qualityResult.breakdown;
            updates.csatPrediction = String(qualityResult.csatPrediction);
            updates.resolutionStatus = qualityResult.resolutionStatus;
          } catch (qaErr) {
            console.error(`[Twilio Status] Quality scoring failed for call ${callLog.id}:`, qaErr);
          }
        }
      }

      if (!updates.finalOutcome) {
        updates.finalOutcome = callStatus === "completed" ? "completed_normally" : callStatus;
      }
    } else if (callStatus === "in-progress") {
      updates.status = "in-progress";
      updates.connectedAt = new Date();
    }

    if (Object.keys(updates).length > 0) {
      await db.update(callLogs).set(updates).where(eq(callLogs.id, callLog.id));
    }

    if (callStatus === "failed" || callStatus === "busy" || callStatus === "no-answer") {
      notifyCallFailure(callLog.orgId, callLog.id, callStatus, callLog.direction).catch(() => {});
    }

    if (callStatus === "completed" || callStatus === "no-answer" || callStatus === "busy" || callStatus === "failed" || callStatus === "canceled") {
      const webhookEvent = callLog.handoffTriggered ? "call.handoff" :
        callLog.finalOutcome === "voicemail" ? "call.voicemail" : "call.completed";
      const durationSeconds = callDuration ? parseInt(callDuration, 10) : 0;
      await dispatchWebhook(callLog.orgId, webhookEvent, {
        callId: callLog.id,
        direction: callLog.direction,
        duration: durationSeconds,
        outcome: callLog.finalOutcome,
        qualityScore: updates.qualityScore,
        sentimentScore: callLog.sentimentScore,
      }).catch(err => console.error("Webhook dispatch error:", err));
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Twilio status webhook error:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

async function notifyCallFailure(orgId: number, callId: number, status: string, direction: string) {
  try {
    const members = await db
      .select({ userId: orgMembers.userId })
      .from(orgMembers)
      .where(eq(orgMembers.orgId, orgId));

    const statusLabel = status === "no-answer" ? "No Answer" : status === "busy" ? "Busy" : "Failed";
    for (const member of members) {
      await createNotification({
        userId: member.userId,
        orgId,
        type: "call_failure",
        title: `Call ${statusLabel}`,
        message: `${direction === "inbound" ? "Inbound" : "Outbound"} call #${callId} ended with status: ${statusLabel}.`,
        actionUrl: "/dashboard/calls",
      });
    }
  } catch (err) {
    console.error("[Notifications] Call failure notification error:", err);
  }
}
