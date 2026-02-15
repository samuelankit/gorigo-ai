import { z } from "zod";

const DANGEROUS_CHARS_REGEX = /[<>'";&|`$\\]/g;

export function sanitizeString(input: string): string {
  return input.replace(DANGEROUS_CHARS_REGEX, "").trim();
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

export const safeString = (minLen = 1, maxLen = 500) =>
  z.string().min(minLen).max(maxLen).transform((v) => v.trim());

export const safeEmail = z
  .string()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase().trim());

export const safePhone = z
  .string()
  .min(7)
  .max(20)
  .regex(/^\+?[0-9\s\-()]+$/, "Invalid phone number format");

export const safeUrl = z
  .string()
  .url()
  .max(2048)
  .refine((v) => v.startsWith("http://") || v.startsWith("https://"), "URL must use http or https");

export const safePositiveNumber = z.number().positive().finite();

export const safePositiveInt = z.number().int().positive().finite();

export const safePaginationLimit = z.number().int().min(1).max(100).default(50);

export const safePaginationOffset = z.number().int().min(0).default(0);

export function validatePagination(query: URLSearchParams): { limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(query.get("limit") || "50", 10) || 50, 1), 100);
  const offset = Math.max(parseInt(query.get("offset") || "0", 10) || 0, 0);
  return { limit, offset };
}

export function truncateString(input: string, maxLen: number): string {
  if (input.length <= maxLen) return input;
  return input.slice(0, maxLen);
}
