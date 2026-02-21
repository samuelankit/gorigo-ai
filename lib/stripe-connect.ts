import { getUncachableStripeClient, isStripeConnectorConfigured } from "@/lib/stripe-client";

export async function isStripeConfigured(): Promise<boolean> {
  if (process.env.STRIPE_SECRET_KEY) return true;
  return isStripeConnectorConfigured();
}

async function getStripe() {
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import("stripe")).default;
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
    });
  }
  return getUncachableStripeClient();
}

export async function createConnectedAccount(partnerEmail: string, partnerName: string, country: string = "GB"): Promise<string | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  const account = await stripe.accounts.create({
    type: "express",
    country,
    email: partnerEmail,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "company",
    business_profile: {
      name: partnerName,
      product_description: "GoRigo AI Call Centre partner commissions",
    },
  });

  return account.id;
}

export async function createOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return accountLink.url;
}

export async function checkAccountStatus(accountId: string): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
} | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  };
}

export async function createTransfer(
  accountId: string,
  amountInPence: number,
  currency: string = "gbp",
  description: string = "Commission payout"
): Promise<{ transferId: string } | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  const transfer = await stripe.transfers.create({
    amount: amountInPence,
    currency: currency.toLowerCase(),
    destination: accountId,
    description,
  });

  return { transferId: transfer.id };
}

export async function getAccountBalance(accountId: string): Promise<{ available: number; pending: number } | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  const balance = await stripe.balance.retrieve({
    stripeAccount: accountId,
  });

  const available = balance.available.reduce((sum, b) => sum + b.amount, 0);
  const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0);

  return { available, pending };
}

export async function createLoginLink(accountId: string): Promise<string | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}
