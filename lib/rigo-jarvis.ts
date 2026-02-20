import { db } from "@/lib/db";
import { rigoReminders, rigoNotes, rigoFollowUps, rigoConversations, callLogs, agents, wallets } from "@/shared/schema";
import { eq, and, desc, gte, lte, sql, count, lt } from "drizzle-orm";
import { getWalletBalance } from "@/lib/wallet";

const FREE_INTENTS = new Set(["reminder", "note", "follow_up", "briefing", "list_reminders", "list_notes", "list_follow_ups", "complete_reminder", "complete_follow_up"]);

export function isUtilityIntent(intent: string): boolean {
  return FREE_INTENTS.has(intent);
}

export function detectJarvisIntent(message: string): string | null {
  const lower = message.toLowerCase();

  if (/\b(remind|reminder)\b/.test(lower)) {
    if (/\b(list|show|what|pending|upcoming|my)\b.*\b(remind|reminder)/.test(lower) ||
        /\b(remind|reminder)s?\b.*\b(list|show|pending|upcoming)\b/.test(lower)) {
      return "list_reminders";
    }
    if (/\b(done|complete|dismiss|cancel|delete|remove)\b.*\b(remind|reminder)\b/.test(lower) ||
        /\b(remind|reminder)\b.*\b(done|complete|dismiss|cancel|delete|remove)\b/.test(lower)) {
      return "complete_reminder";
    }
    return "reminder";
  }

  if (/\b(note|jot|write down|take note|record)\b/.test(lower)) {
    if (/\b(list|show|what|my|recent)\b.*\b(note)/.test(lower) ||
        /\b(note)s?\b.*\b(list|show|recent)\b/.test(lower)) {
      return "list_notes";
    }
    return "note";
  }

  if (/\b(follow.?up|callback|call.?back|chase)\b/.test(lower)) {
    if (/\b(list|show|what|pending|my|upcoming)\b.*\b(follow|callback|call.?back|chase)/.test(lower) ||
        /\b(follow|callback|call.?back|chase).*\b(list|show|pending|upcoming)\b/.test(lower)) {
      return "list_follow_ups";
    }
    if (/\b(done|complete|dismiss|cancel)\b.*\b(follow|callback|call.?back)/.test(lower) ||
        /\b(follow|callback|call.?back).*\b(done|complete|dismiss|cancel)\b/.test(lower)) {
      return "complete_follow_up";
    }
    return "follow_up";
  }

  if (/\b(briefing|brief me|morning brief|daily brief|daily summary|how.*doing today|give me.*rundown)\b/.test(lower)) {
    return "briefing";
  }

  return null;
}

function parseTimeFromMessage(message: string): Date {
  const now = new Date();
  const lower = message.toLowerCase();

  const inMatch = lower.match(/in\s+(\d+)\s*(minute|min|hour|hr|day|week)s?/);
  if (inMatch) {
    const amount = parseInt(inMatch[1]);
    const unit = inMatch[2];
    const future = new Date(now);
    if (unit.startsWith("min")) future.setMinutes(future.getMinutes() + amount);
    else if (unit.startsWith("hour") || unit === "hr") future.setHours(future.getHours() + amount);
    else if (unit.startsWith("day")) future.setDate(future.getDate() + amount);
    else if (unit.startsWith("week")) future.setDate(future.getDate() + amount * 7);
    return future;
  }

  const atMatch = lower.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (atMatch) {
    let hours = parseInt(atMatch[1]);
    const minutes = atMatch[2] ? parseInt(atMatch[2]) : 0;
    const period = atMatch[3];
    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target;
  }

  const tomorrowMatch = lower.match(/tomorrow/);
  if (tomorrowMatch) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }

  const nextWeekMatch = lower.match(/next\s+week/);
  if (nextWeekMatch) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0);
    return nextWeek;
  }

  const defaultTime = new Date(now);
  defaultTime.setHours(defaultTime.getHours() + 1);
  return defaultTime;
}

function extractReminderMessage(message: string): string {
  return message
    .replace(/\b(remind me to|set a reminder to|reminder to|remind me|set reminder)\b/gi, "")
    .replace(/\b(in\s+\d+\s*(minute|min|hour|hr|day|week)s?)\b/gi, "")
    .replace(/\b(at\s+\d{1,2}(:\d{2})?\s*(am|pm)?)\b/gi, "")
    .replace(/\b(tomorrow|next\s+week)\b/gi, "")
    .trim() || "Follow up";
}

function extractContactInfo(message: string): { name?: string; phone?: string } {
  const phoneMatch = message.match(/(\+?\d[\d\s-]{8,})/);
  const nameMatch = message.match(/(?:with|for|about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  return {
    name: nameMatch?.[1],
    phone: phoneMatch?.[1]?.replace(/\s/g, ""),
  };
}

export async function handleReminder(userId: number, orgId: number, message: string): Promise<string> {
  const triggerAt = parseTimeFromMessage(message);
  const reminderMsg = extractReminderMessage(message);

  await db.insert(rigoReminders).values({
    userId,
    orgId,
    message: reminderMsg,
    triggerAt,
    status: "pending",
    deliveryMethod: "in_app",
  });

  const timeStr = triggerAt.toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  return `Done. I have set a reminder to "${reminderMsg}" for ${timeStr}. I will notify you when it is time.`;
}

export async function handleListReminders(userId: number, orgId: number): Promise<string> {
  const reminders = await db
    .select()
    .from(rigoReminders)
    .where(and(
      eq(rigoReminders.userId, userId),
      eq(rigoReminders.orgId, orgId),
      eq(rigoReminders.status, "pending"),
    ))
    .orderBy(rigoReminders.triggerAt)
    .limit(10);

  if (reminders.length === 0) {
    return "You have no pending reminders.";
  }

  const list = reminders.map((r, i) => {
    const time = r.triggerAt.toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    return `${i + 1}. "${r.message}" — ${time}`;
  }).join(". ");

  return `You have ${reminders.length} pending reminder${reminders.length > 1 ? "s" : ""}. ${list}.`;
}

export async function handleCompleteReminder(userId: number, orgId: number, message: string): Promise<string> {
  const numberMatch = message.match(/\b(\d+)\b/);

  if (numberMatch) {
    const idx = parseInt(numberMatch[1]) - 1;
    const reminders = await db
      .select()
      .from(rigoReminders)
      .where(and(
        eq(rigoReminders.userId, userId),
        eq(rigoReminders.orgId, orgId),
        eq(rigoReminders.status, "pending"),
      ))
      .orderBy(rigoReminders.triggerAt)
      .limit(10);

    if (idx >= 0 && idx < reminders.length) {
      await db.update(rigoReminders)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(rigoReminders.id, reminders[idx].id));
      return `Done. I have marked reminder "${reminders[idx].message}" as complete.`;
    }
    return "I could not find that reminder number. Say 'list my reminders' to see them.";
  }

  const [latest] = await db
    .select()
    .from(rigoReminders)
    .where(and(
      eq(rigoReminders.userId, userId),
      eq(rigoReminders.orgId, orgId),
      eq(rigoReminders.status, "pending"),
    ))
    .orderBy(rigoReminders.triggerAt)
    .limit(1);

  if (latest) {
    await db.update(rigoReminders)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(rigoReminders.id, latest.id));
    return `Done. I have marked your next reminder "${latest.message}" as complete.`;
  }

  return "You have no pending reminders to complete.";
}

export async function handleNote(userId: number, orgId: number, message: string): Promise<string> {
  const content = message
    .replace(/\b(note|jot down|write down|take note|record)\b/gi, "")
    .replace(/\b(that|this|please|can you)\b/gi, "")
    .trim() || message;

  const tagMatch = message.match(/\b(call|customer|meeting|idea|todo|urgent|important)\b/gi);
  const tags = tagMatch ? Array.from(new Set(tagMatch.map(t => t.toLowerCase()))) : [];

  await db.insert(rigoNotes).values({
    userId,
    orgId,
    content,
    tags: tags.length > 0 ? tags : null,
    source: "voice",
  });

  return `Noted. I have saved that for you${tags.length > 0 ? ` and tagged it as ${tags.join(", ")}` : ""}.`;
}

export async function handleListNotes(userId: number, orgId: number): Promise<string> {
  const notes = await db
    .select()
    .from(rigoNotes)
    .where(and(
      eq(rigoNotes.userId, userId),
      eq(rigoNotes.orgId, orgId),
    ))
    .orderBy(desc(rigoNotes.createdAt))
    .limit(5);

  if (notes.length === 0) {
    return "You have no notes yet. Say 'note that...' followed by what you want to remember.";
  }

  const list = notes.map((n, i) => {
    const time = n.createdAt ? new Date(n.createdAt).toLocaleString("en-GB", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    }) : "unknown";
    const preview = n.content.length > 60 ? n.content.slice(0, 60) + "..." : n.content;
    return `${i + 1}. "${preview}" — ${time}`;
  }).join(". ");

  return `Your ${notes.length} most recent note${notes.length > 1 ? "s" : ""}. ${list}.`;
}

export async function handleFollowUp(userId: number, orgId: number, message: string): Promise<string> {
  const contact = extractContactInfo(message);
  const dueAt = parseTimeFromMessage(message);

  const reason = message
    .replace(/\b(follow\s*up|call\s*back|callback|chase|set|create|add|schedule)\b/gi, "")
    .replace(/\b(with|for|about)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?/g, "")
    .replace(/\b(in\s+\d+\s*(minute|min|hour|hr|day|week)s?)\b/gi, "")
    .replace(/\b(at\s+\d{1,2}(:\d{2})?\s*(am|pm)?)\b/gi, "")
    .replace(/\b(tomorrow|next\s+week)\b/gi, "")
    .replace(/(\+?\d[\d\s-]{8,})/g, "")
    .trim() || "Follow up required";

  await db.insert(rigoFollowUps).values({
    userId,
    orgId,
    contactName: contact.name || null,
    contactPhone: contact.phone || null,
    reason,
    dueAt,
    status: "pending",
  });

  const timeStr = dueAt.toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  const contactStr = contact.name ? ` with ${contact.name}` : "";
  return `Follow-up scheduled${contactStr} for ${timeStr}. Reason: ${reason}. I will remind you when it is due.`;
}

export async function handleListFollowUps(userId: number, orgId: number): Promise<string> {
  const followUps = await db
    .select()
    .from(rigoFollowUps)
    .where(and(
      eq(rigoFollowUps.userId, userId),
      eq(rigoFollowUps.orgId, orgId),
      eq(rigoFollowUps.status, "pending"),
    ))
    .orderBy(rigoFollowUps.dueAt)
    .limit(10);

  if (followUps.length === 0) {
    return "You have no pending follow-ups.";
  }

  const list = followUps.map((f, i) => {
    const time = f.dueAt.toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const contact = f.contactName ? `with ${f.contactName}` : "";
    return `${i + 1}. ${contact} "${f.reason}" — due ${time}`;
  }).join(". ");

  return `You have ${followUps.length} pending follow-up${followUps.length > 1 ? "s" : ""}. ${list}.`;
}

export async function handleCompleteFollowUp(userId: number, orgId: number, message: string): Promise<string> {
  const numberMatch = message.match(/\b(\d+)\b/);

  if (numberMatch) {
    const idx = parseInt(numberMatch[1]) - 1;
    const followUps = await db
      .select()
      .from(rigoFollowUps)
      .where(and(
        eq(rigoFollowUps.userId, userId),
        eq(rigoFollowUps.orgId, orgId),
        eq(rigoFollowUps.status, "pending"),
      ))
      .orderBy(rigoFollowUps.dueAt)
      .limit(10);

    if (idx >= 0 && idx < followUps.length) {
      await db.update(rigoFollowUps)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(rigoFollowUps.id, followUps[idx].id));
      return `Done. Follow-up "${followUps[idx].reason}" marked as complete.`;
    }
    return "I could not find that follow-up number. Say 'list my follow-ups' to see them.";
  }

  const [latest] = await db
    .select()
    .from(rigoFollowUps)
    .where(and(
      eq(rigoFollowUps.userId, userId),
      eq(rigoFollowUps.orgId, orgId),
      eq(rigoFollowUps.status, "pending"),
    ))
    .orderBy(rigoFollowUps.dueAt)
    .limit(1);

  if (latest) {
    await db.update(rigoFollowUps)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(rigoFollowUps.id, latest.id));
    return `Done. Follow-up "${latest.reason}" marked as complete.`;
  }

  return "You have no pending follow-ups to complete.";
}

export async function generateBriefing(userId: number, orgId: number): Promise<string> {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const parts: string[] = ["Here is your briefing."];

  try {
    const [yesterdayStats] = await db
      .select({
        total: count(),
        answered: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
        missed: sql<number>`COUNT(CASE WHEN status = 'missed' OR status = 'no-answer' THEN 1 END)`,
        avgDuration: sql<number>`COALESCE(AVG(duration), 0)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, orgId),
        gte(callLogs.createdAt, yesterday),
        lt(callLogs.createdAt, todayStart),
      ));

    if (yesterdayStats.total > 0) {
      parts.push(`Yesterday you had ${yesterdayStats.total} call${yesterdayStats.total > 1 ? "s" : ""}, ${yesterdayStats.answered} answered and ${yesterdayStats.missed} missed. Average call duration was ${Math.round(Number(yesterdayStats.avgDuration))} seconds.`);
    } else {
      parts.push("No calls were received yesterday.");
    }
  } catch {
    parts.push("Call data is temporarily unavailable.");
  }

  try {
    const pendingFollowUps = await db
      .select({ total: count() })
      .from(rigoFollowUps)
      .where(and(
        eq(rigoFollowUps.userId, userId),
        eq(rigoFollowUps.orgId, orgId),
        eq(rigoFollowUps.status, "pending"),
      ));

    const overdueFollowUps = await db
      .select({ total: count() })
      .from(rigoFollowUps)
      .where(and(
        eq(rigoFollowUps.userId, userId),
        eq(rigoFollowUps.orgId, orgId),
        eq(rigoFollowUps.status, "pending"),
        lt(rigoFollowUps.dueAt, now),
      ));

    if (pendingFollowUps[0].total > 0) {
      parts.push(`You have ${pendingFollowUps[0].total} pending follow-up${pendingFollowUps[0].total > 1 ? "s" : ""}${overdueFollowUps[0].total > 0 ? `, ${overdueFollowUps[0].total} overdue` : ""}.`);
    }
  } catch {}

  try {
    const pendingReminders = await db
      .select({ total: count() })
      .from(rigoReminders)
      .where(and(
        eq(rigoReminders.userId, userId),
        eq(rigoReminders.orgId, orgId),
        eq(rigoReminders.status, "pending"),
      ));

    if (pendingReminders[0].total > 0) {
      parts.push(`You have ${pendingReminders[0].total} pending reminder${pendingReminders[0].total > 1 ? "s" : ""}.`);
    }
  } catch {}

  try {
    const balance = await getWalletBalance(orgId);
    parts.push(`Your wallet balance is ${balance.toFixed(2)} pounds.`);
    if (balance < 10) {
      parts.push("Your balance is running low. Consider topping up soon to keep your agents running.");
    }
  } catch {}

  try {
    const [agentCount] = await db
      .select({ total: count() })
      .from(agents)
      .where(eq(agents.orgId, orgId));
    parts.push(`You have ${agentCount.total} agent${agentCount.total !== 1 ? "s" : ""} configured.`);
  } catch {}

  return parts.join(" ");
}

export async function saveConversationMessage(
  userId: number,
  orgId: number,
  role: string,
  content: string,
  intent?: string
): Promise<void> {
  try {
    await db.insert(rigoConversations).values({
      userId,
      orgId,
      role,
      content,
      intent,
    });
  } catch (err) {
    console.error("[Rigo] Failed to save conversation:", err);
  }
}

export async function loadConversationHistory(
  userId: number,
  orgId: number,
  limit: number = 20
): Promise<Array<{ role: string; content: string }>> {
  try {
    const rows = await db
      .select({ role: rigoConversations.role, content: rigoConversations.content })
      .from(rigoConversations)
      .where(and(
        eq(rigoConversations.userId, userId),
        eq(rigoConversations.orgId, orgId),
      ))
      .orderBy(desc(rigoConversations.createdAt))
      .limit(limit);
    return rows.reverse();
  } catch {
    return [];
  }
}

export async function generateAfterCallSummary(
  callId: number,
  transcript: string,
  callLLMFn: (messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, opts?: any) => Promise<any>
): Promise<string> {
  if (!transcript || transcript.trim().length < 50) {
    return "Call too short for summary.";
  }

  const messages = [
    {
      role: "system" as const,
      content: "You are a call centre analyst. Write a 2-3 sentence summary of this call transcript. Include: the caller's intent, the outcome, and any follow-up actions needed. Be factual and concise. British English.",
    },
    {
      role: "user" as const,
      content: `Summarise this call transcript:\n\n${transcript.slice(0, 3000)}`,
    },
  ];

  try {
    const result = await callLLMFn(messages, { maxTokens: 150, temperature: 0.3 });
    const summary = result.content;

    await db.update(callLogs)
      .set({ summary })
      .where(eq(callLogs.id, callId));

    return summary;
  } catch (err) {
    console.error("[Rigo] After-call summary failed:", err);
    return "Summary generation failed.";
  }
}

export async function getDueReminders(orgId: number): Promise<Array<{ id: number; userId: number; message: string }>> {
  const now = new Date();
  try {
    return await db
      .select({
        id: rigoReminders.id,
        userId: rigoReminders.userId,
        message: rigoReminders.message,
      })
      .from(rigoReminders)
      .where(and(
        eq(rigoReminders.orgId, orgId),
        eq(rigoReminders.status, "pending"),
        lte(rigoReminders.triggerAt, now),
      ))
      .limit(10);
  } catch {
    return [];
  }
}

export async function markReminderFired(reminderId: number): Promise<void> {
  await db.update(rigoReminders)
    .set({ status: "fired" })
    .where(eq(rigoReminders.id, reminderId));
}
