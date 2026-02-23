export function normalizePhoneE164(phone: string, defaultCountry: string = "GB"): { valid: boolean; e164: string; original: string } {
  const original = phone;
  let cleaned = phone.replace(/[\s\-\(\)\.\+]/g, "").replace(/^00/, "");

  if (!cleaned || !/^\d{7,15}$/.test(cleaned)) {
    return { valid: false, e164: "", original };
  }

  if (phone.startsWith("+")) {
    const digits = phone.replace(/[^\d+]/g, "");
    if (/^\+\d{10,15}$/.test(digits)) {
      return { valid: true, e164: digits, original };
    }
  }

  const countryPrefixes: Record<string, string> = {
    GB: "44", US: "1", AU: "61", CA: "1", IE: "353",
    DE: "49", FR: "33", ES: "34", IT: "39", NL: "31",
    IN: "91", ZA: "27", NZ: "64", SG: "65", HK: "852",
  };

  const prefix = countryPrefixes[defaultCountry.toUpperCase()] || "44";

  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith(prefix)) {
    const e164 = "+" + cleaned;
    if (e164.length >= 10 && e164.length <= 16) {
      return { valid: true, e164, original };
    }
  }

  const e164 = "+" + prefix + cleaned;
  if (e164.length >= 10 && e164.length <= 16) {
    return { valid: true, e164, original };
  }

  return { valid: false, e164: "", original };
}

export function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const phonePatterns = /^(phone|mobile|tel|telephone|cell|contact\s*no|phone\s*number|mobile\s*no|tel\s*no)$/i;
  const namePatterns = /^(name|full\s*name|contact\s*name|first\s*name|person)$/i;
  const emailPatterns = /^(email|e-mail|email\s*address|mail)$/i;
  const companyPatterns = /^(company|business|business\s*name|company\s*name|organisation|organization|org)$/i;

  for (const header of headers) {
    const h = header.trim();
    if (!mapping.phone && phonePatterns.test(h)) mapping.phone = header;
    if (!mapping.name && namePatterns.test(h)) mapping.name = header;
    if (!mapping.email && emailPatterns.test(h)) mapping.email = header;
    if (!mapping.company && companyPatterns.test(h)) mapping.company = header;
  }

  return mapping;
}
