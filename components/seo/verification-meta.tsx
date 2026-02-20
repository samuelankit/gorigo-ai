import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function getVerificationCodes(): Promise<Record<string, string>> {
  try {
    const result = await db.execute(
      sql`SELECT key, value FROM platform_settings WHERE key LIKE 'seo_verification_%'`
    );
    const codes: Record<string, string> = {};
    for (const row of result.rows as any[]) {
      const engine = row.key.replace("seo_verification_", "");
      codes[engine] = row.value;
    }
    return codes;
  } catch {
    return {};
  }
}

export async function VerificationMeta() {
  const codes = await getVerificationCodes();

  return (
    <>
      {codes.google && (
        <meta name="google-site-verification" content={codes.google} />
      )}
      {codes.bing && (
        <meta name="msvalidate.01" content={codes.bing} />
      )}
      {codes.yandex && (
        <meta name="yandex-verification" content={codes.yandex} />
      )}
      {codes.baidu && (
        <meta name="baidu-site-verification" content={codes.baidu} />
      )}
      {codes.pinterest && (
        <meta name="p:domain_verify" content={codes.pinterest} />
      )}
    </>
  );
}
