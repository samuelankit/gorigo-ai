const EXCHANGE_RATES: Record<string, number> = {
  GBP: 1.0,
  USD: 1.27,
  EUR: 1.17,
  CAD: 1.72,
  AUD: 1.95,
  INR: 105.50,
  JPY: 190.00,
  BRL: 6.35,
  MXN: 21.80,
  AED: 4.67,
  SGD: 1.71,
  ZAR: 23.50,
  SEK: 13.20,
  CHF: 1.12,
  PLN: 5.08,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "\u00a3",
  USD: "$",
  EUR: "\u20ac",
  CAD: "C$",
  AUD: "A$",
  INR: "\u20b9",
  JPY: "\u00a5",
  BRL: "R$",
  MXN: "MX$",
  AED: "AED",
  SGD: "S$",
  ZAR: "R",
  SEK: "kr",
  CHF: "CHF",
  PLN: "z\u0142",
};

const COUNTRY_CURRENCIES: Record<string, string> = {
  GB: "GBP", US: "USD", CA: "CAD", AU: "AUD", IE: "EUR",
  FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
  IN: "INR", JP: "JPY", BR: "BRL", MX: "MXN",
  AE: "AED", SG: "SGD", ZA: "ZAR", SE: "SEK", CH: "CHF", PL: "PLN",
};

export function convertFromGBP(amountGBP: number, targetCurrency: string): number {
  const rate = EXCHANGE_RATES[targetCurrency.toUpperCase()];
  if (!rate) return amountGBP;
  return Math.round(amountGBP * rate * 100) / 100;
}

export function convertToGBP(amount: number, sourceCurrency: string): number {
  const rate = EXCHANGE_RATES[sourceCurrency.toUpperCase()];
  if (!rate) return amount;
  return Math.round((amount / rate) * 100) / 100;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
  return `${symbol}${amount.toFixed(2)}`;
}

export function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCIES[countryCode.toUpperCase()] || "GBP";
}

export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

export function getExchangeRate(currencyCode: string): number {
  return EXCHANGE_RATES[currencyCode.toUpperCase()] || 1.0;
}

export function formatWithConversion(amountGBP: number, countryCode: string): {
  base: string;
  converted: string;
  currency: string;
  rate: number;
} {
  const currency = getCurrencyForCountry(countryCode);
  const rate = getExchangeRate(currency);
  const converted = convertFromGBP(amountGBP, currency);
  
  return {
    base: formatCurrency(amountGBP, "GBP"),
    converted: formatCurrency(converted, currency),
    currency,
    rate,
  };
}

export { EXCHANGE_RATES, CURRENCY_SYMBOLS, COUNTRY_CURRENCIES };
