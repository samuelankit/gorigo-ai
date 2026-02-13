import { db } from "@/lib/db";
import { doNotCallList, consentRecords } from "@/shared/schema";
import { eq, and, isNull, or, gt } from "drizzle-orm";

export function normalizePhoneNumber(phone: string): string {
  let normalized = phone.replace(/[\s\-\(\)\.]/g, "");
  if (!normalized.startsWith("+")) {
    normalized = "+" + normalized;
  }
  return normalized;
}

export async function isOnDNCList(orgId: number, phoneNumber: string): Promise<boolean> {
  const normalized = normalizePhoneNumber(phoneNumber);
  const now = new Date();

  const results = await db
    .select({ id: doNotCallList.id })
    .from(doNotCallList)
    .where(
      and(
        eq(doNotCallList.orgId, orgId),
        eq(doNotCallList.phoneNumber, normalized),
        or(isNull(doNotCallList.expiresAt), gt(doNotCallList.expiresAt, now))
      )
    )
    .limit(1);

  return results.length > 0;
}

export async function addToDNCList(
  orgId: number,
  phoneNumber: string,
  reason: string,
  source: string,
  addedBy?: number,
  notes?: string
): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);

  const existing = await db
    .select({ id: doNotCallList.id })
    .from(doNotCallList)
    .where(
      and(
        eq(doNotCallList.orgId, orgId),
        eq(doNotCallList.phoneNumber, normalized)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.insert(doNotCallList).values({
    orgId,
    phoneNumber: normalized,
    reason,
    source,
    addedBy,
    notes,
  });
}

export async function removeFromDNCList(orgId: number, phoneNumber: string): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);

  await db
    .delete(doNotCallList)
    .where(
      and(
        eq(doNotCallList.orgId, orgId),
        eq(doNotCallList.phoneNumber, normalized)
      )
    );
}

export async function recordConsent(
  orgId: number,
  phoneNumber: string,
  consentType: string,
  consentGiven: boolean,
  method: string,
  consentText?: string,
  callLogId?: number
): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);

  await db.insert(consentRecords).values({
    orgId,
    phoneNumber: normalized,
    consentType,
    consentGiven,
    consentMethod: method,
    consentText,
    callLogId,
  });
}

export async function hasValidConsent(
  orgId: number,
  phoneNumber: string,
  consentType: string
): Promise<boolean> {
  const normalized = normalizePhoneNumber(phoneNumber);
  const now = new Date();

  const results = await db
    .select({ id: consentRecords.id })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.orgId, orgId),
        eq(consentRecords.phoneNumber, normalized),
        eq(consentRecords.consentType, consentType),
        eq(consentRecords.consentGiven, true),
        isNull(consentRecords.revokedAt),
        or(isNull(consentRecords.expiresAt), gt(consentRecords.expiresAt, now))
      )
    )
    .limit(1);

  return results.length > 0;
}

export async function revokeConsent(
  orgId: number,
  phoneNumber: string,
  consentType: string,
  reason?: string
): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);

  await db
    .update(consentRecords)
    .set({
      revokedAt: new Date(),
      revokedReason: reason,
    })
    .where(
      and(
        eq(consentRecords.orgId, orgId),
        eq(consentRecords.phoneNumber, normalized),
        eq(consentRecords.consentType, consentType),
        isNull(consentRecords.revokedAt)
      )
    );
}
