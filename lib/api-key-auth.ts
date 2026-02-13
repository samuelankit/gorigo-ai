export type ApiKeyScope =
  | "calls:read"
  | "calls:write"
  | "agents:read"
  | "agents:write"
  | "knowledge:read"
  | "knowledge:write"
  | "analytics:read"
  | "billing:read"
  | "webhooks:manage"
  | "contacts:read"
  | "contacts:write"
  | "export:read";

const SCOPE_HIERARCHY: Record<string, string[]> = {
  "calls:write": ["calls:read"],
  "agents:write": ["agents:read"],
  "knowledge:write": ["knowledge:read"],
  "contacts:write": ["contacts:read"],
};

export function hasScope(grantedScopes: string[], requiredScope: string): boolean {
  if (grantedScopes.length === 0) return true;
  if (grantedScopes.includes("*")) return true;
  if (grantedScopes.includes(requiredScope)) return true;

  for (const granted of grantedScopes) {
    const implies = SCOPE_HIERARCHY[granted];
    if (implies && implies.includes(requiredScope)) return true;
  }

  return false;
}

export const AVAILABLE_SCOPES: ApiKeyScope[] = [
  "calls:read", "calls:write",
  "agents:read", "agents:write",
  "knowledge:read", "knowledge:write",
  "analytics:read", "billing:read",
  "webhooks:manage",
  "contacts:read", "contacts:write",
  "export:read",
];
