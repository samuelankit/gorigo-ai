const BLOCKED_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^fd/i,
  /^localhost$/i,
];

export function validateUrlForFetch(rawUrl: string): { valid: boolean; error?: string; url?: URL } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: "Invalid URL" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, error: "Only HTTP/HTTPS URLs are allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();

  for (const pattern of BLOCKED_IP_RANGES) {
    if (pattern.test(hostname)) {
      return { valid: false, error: "URL points to a private or reserved address" };
    }
  }

  if (hostname === "metadata.google.internal" || hostname.endsWith(".internal")) {
    return { valid: false, error: "URL points to a private or reserved address" };
  }

  if (hostname.includes("169.254") || hostname.includes("metadata")) {
    return { valid: false, error: "URL points to a private or reserved address" };
  }

  return { valid: true, url: parsed };
}

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

export async function safeFetch(url: string, options?: { method?: string; timeoutMs?: number }): Promise<Response> {
  const check = validateUrlForFetch(url);
  if (!check.valid) {
    throw new Error(check.error || "Blocked URL");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 10000);

  try {
    const res = await fetch(url, {
      method: options?.method || "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "GoRigoBot/1.0 (https://gorigo.ai)",
        "Accept": "text/html, image/*, */*",
      },
      redirect: "follow",
    });

    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      throw new Error("Response too large");
    }

    return res;
  } finally {
    clearTimeout(timeout);
  }
}
