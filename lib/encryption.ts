import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const HKDF_INFO = "gorigo-credential-encryption";

let derivedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (derivedKey) return derivedKey;

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required for encryption");
  }

  derivedKey = crypto.hkdfSync(
    "sha256",
    sessionSecret,
    "",
    HKDF_INFO,
    KEY_LENGTH
  ) as Buffer;

  return Buffer.from(derivedKey);
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

export function decrypt(ciphertext: string): string | null {
  try {
    const key = getEncryptionKey();
    const data = Buffer.from(ciphertext, "base64");

    if (data.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      console.error("Encryption: invalid ciphertext length");
      return null;
    }

    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (err) {
    console.error("Encryption: decryption failed —", err instanceof Error ? err.message : "unknown error");
    return null;
  }
}

export function maskKey(key: string): string {
  if (!key || key.length < 8) {
    return "\u2022\u2022\u2022\u2022";
  }
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
