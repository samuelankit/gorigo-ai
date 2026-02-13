export interface RedactionResult {
  redactedText: string;
  piiFound: PIIMatch[];
  piiCount: number;
}

export interface PIIMatch {
  type: string;
  original: string;
  redacted: string;
  position: number;
}

const PII_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  { name: "credit_card", pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g, replacement: "[CARD_REDACTED]" },
  { name: "credit_card", pattern: /\b(?:\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4})\b/g, replacement: "[CARD_REDACTED]" },
  { name: "ssn", pattern: /(?:(?:ssn|social\s*security(?:\s*number)?|ss#)\s*(?:is|:)?\s*)\b\d{3}[\s\-]\d{2}[\s\-]\d{4}\b/gi, replacement: "[SSN_REDACTED]" },
  { name: "ssn_formatted", pattern: /(?:(?:ssn|social\s*security(?:\s*number)?|ss#)\s*(?:is|:)?\s*)\b\d{3}-\d{2}-\d{4}\b/gi, replacement: "[SSN_REDACTED]" },
  { name: "ni_number", pattern: /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi, replacement: "[NI_REDACTED]" },
  { name: "email", pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, replacement: "[EMAIL_REDACTED]" },
  { name: "dob", pattern: /\b(?:date of birth|dob|born on|birthday)\s*(?:is|:)?\s*\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4}\b/gi, replacement: "[DOB_REDACTED]" },
  { name: "bank_account", pattern: /\b\d{2}[\s\-]?\d{2}[\s\-]?\d{2}\s+\d{7,8}\b/g, replacement: "[BANK_REDACTED]" },
  { name: "cvv", pattern: /\b(?:cvv|cvc|security code|card code)\s*(?:is|:)?\s*\d{3,4}\b/gi, replacement: "[CVV_REDACTED]" },
  { name: "passport", pattern: /\b(?:passport)\s*(?:number|no|#)?\s*(?:is|:)?\s*[A-Z0-9]{6,12}\b/gi, replacement: "[PASSPORT_REDACTED]" },
  { name: "drivers_license", pattern: /\b(?:driver'?s?\s*licen[cs]e|DL)\s*(?:number|no|#)?\s*(?:is|:)?\s*[A-Z0-9\-]{5,20}\b/gi, replacement: "[DL_REDACTED]" },
];

export function redactPII(text: string): RedactionResult {
  let redactedText = text;
  const piiFound: PIIMatch[] = [];

  for (const { name, pattern, replacement } of PII_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      piiFound.push({
        type: name,
        original: match[0].substring(0, 4) + "***",
        redacted: replacement,
        position: match.index,
      });
    }
    redactedText = redactedText.replace(pattern, replacement);
  }

  return {
    redactedText,
    piiFound,
    piiCount: piiFound.length,
  };
}

export function redactForDisplay(text: string): string {
  return redactPII(text).redactedText;
}

export function hasPII(text: string): boolean {
  for (const { pattern } of PII_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) return true;
  }
  return false;
}
