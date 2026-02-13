export function safeParseNumeric(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed;
}

export function roundMoney(value: number): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function roundRate(value: number, decimals: number = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function validateAmount(amount: number, label: string = "Amount"): string | null {
  if (typeof amount !== "number" || isNaN(amount)) {
    return `${label} must be a valid number`;
  }
  if (amount <= 0) {
    return `${label} must be greater than zero`;
  }
  if (amount > 999999.99) {
    return `${label} exceeds maximum allowed (£999,999.99)`;
  }
  const rounded = roundMoney(amount);
  if (Math.abs(amount - rounded) > 0.001) {
    return `${label} cannot have more than 2 decimal places`;
  }
  return null;
}

export function safeSubtract(a: number, b: number): number {
  return roundMoney(a - b);
}

export function safeAdd(a: number, b: number): number {
  return roundMoney(a + b);
}

export function calculatePercentage(amount: number, percent: number): number {
  return roundMoney((amount * percent) / 100);
}

export function formatCurrency(amount: number, currency: string = "GBP"): string {
  const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;
  return `${symbol}${roundMoney(amount).toFixed(2)}`;
}
