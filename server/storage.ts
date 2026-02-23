import { db } from "./db";
import { pool } from "./db";
import { eq, and, desc, sql, asc, isNull } from "drizzle-orm";
import {
  users, type InsertUser, type User,
  countries, type Country, type InsertCountry,
  countryComplianceProfiles, type CountryComplianceProfile, type InsertCountryComplianceProfile,
  countryRateCards, type CountryRateCard, type InsertCountryRateCard,
  countryHolidays, type CountryHoliday, type InsertCountryHoliday,
  campaigns, type Campaign, type InsertCampaign,
  campaignContacts, type CampaignContact, type InsertCampaignContact,
  dataConnectors, type DataConnector, type InsertDataConnector,
  connectorInterest, type ConnectorInterest, type InsertConnectorInterest,
  wallets, type Wallet,
  walletTransactions, type WalletTransaction,
} from "@shared/schema";
import { encrypt, decrypt } from "../lib/encryption";

export interface IStorage {
  createUser(user: InsertUser): Promise<User>;

  getCountries(): Promise<Country[]>;
  getCountry(id: number): Promise<Country | undefined>;
  getCountryByCode(isoCode: string): Promise<Country | undefined>;
  createCountry(data: InsertCountry): Promise<Country>;
  updateCountry(id: number, data: Partial<InsertCountry>): Promise<Country | undefined>;

  getComplianceProfile(countryId: number): Promise<CountryComplianceProfile | undefined>;
  upsertComplianceProfile(data: InsertCountryComplianceProfile): Promise<CountryComplianceProfile>;

  getRateCards(countryId: number): Promise<CountryRateCard[]>;
  getRateCard(countryId: number, deploymentModel: string, direction: string, numberType: string): Promise<CountryRateCard | undefined>;
  upsertRateCard(data: InsertCountryRateCard): Promise<CountryRateCard>;
  deleteRateCard(id: number): Promise<void>;

  getHolidays(countryId: number, year?: number): Promise<CountryHoliday[]>;
  createHoliday(data: InsertCountryHoliday): Promise<CountryHoliday>;
  deleteHoliday(id: number): Promise<void>;

  getCampaigns(orgId: number): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(data: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, data: Partial<InsertCampaign>): Promise<Campaign | undefined>;

  getCampaignContacts(campaignId: number): Promise<CampaignContact[]>;
  createCampaignContact(data: InsertCampaignContact): Promise<CampaignContact>;
  updateCampaignContact(id: number, data: Partial<InsertCampaignContact>): Promise<CampaignContact | undefined>;
  bulkCreateCampaignContacts(contacts: InsertCampaignContact[]): Promise<number>;

  getConnectors(orgId: number): Promise<DataConnector[]>;
  getConnector(id: number, orgId: number): Promise<DataConnector | undefined>;
  createConnector(data: InsertDataConnector): Promise<DataConnector>;
  updateConnector(id: number, orgId: number, data: Partial<InsertDataConnector>): Promise<DataConnector | undefined>;
  updateConnectorTokens(id: number, orgId: number, tokens: { oauthAccessToken?: string; oauthRefreshToken?: string; oauthExpiresAt?: Date }): Promise<DataConnector | undefined>;
  softDeleteConnector(id: number, orgId: number): Promise<void>;
  getConnectorUsageStats(orgId: number): Promise<{ id: number; name: string; connectorType: string; totalLookups: number }[]>;
  recordConnectorInterest(orgId: number, userId: number, connectorType: string): Promise<ConnectorInterest>;

  lockFunds(orgId: number, campaignId: number, amount: number): Promise<WalletTransaction>;
  chargeLocked(orgId: number, campaignId: number, actualCost: number): Promise<WalletTransaction>;
  releaseAllLocked(orgId: number, campaignId: number): Promise<WalletTransaction>;
  releaseExcessLocked(orgId: number, campaignId: number, excessAmount: number): Promise<WalletTransaction>;
  getLockedFundsBreakdown(orgId: number): Promise<{ campaignId: number; campaignName: string; lockedAmount: string }[]>;

  approveCampaign(id: number, orgId: number, userId: number): Promise<Campaign>;
}

export class DatabaseStorage implements IStorage {
  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getCountries(): Promise<Country[]> {
    return db.select().from(countries).orderBy(asc(countries.name));
  }

  async getCountry(id: number): Promise<Country | undefined> {
    const [country] = await db.select().from(countries).where(eq(countries.id, id));
    return country;
  }

  async getCountryByCode(isoCode: string): Promise<Country | undefined> {
    const [country] = await db.select().from(countries).where(eq(countries.isoCode, isoCode));
    return country;
  }

  async createCountry(data: InsertCountry): Promise<Country> {
    const [created] = await db.insert(countries).values(data).returning();
    return created;
  }

  async updateCountry(id: number, data: Partial<InsertCountry>): Promise<Country | undefined> {
    const [updated] = await db
      .update(countries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(countries.id, id))
      .returning();
    return updated;
  }

  async getComplianceProfile(countryId: number): Promise<CountryComplianceProfile | undefined> {
    const [profile] = await db
      .select()
      .from(countryComplianceProfiles)
      .where(eq(countryComplianceProfiles.countryId, countryId));
    return profile;
  }

  async upsertComplianceProfile(data: InsertCountryComplianceProfile): Promise<CountryComplianceProfile> {
    const existing = await this.getComplianceProfile(data.countryId);
    if (existing) {
      const [updated] = await db
        .update(countryComplianceProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(countryComplianceProfiles.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(countryComplianceProfiles).values(data).returning();
    return created;
  }

  async getRateCards(countryId: number): Promise<CountryRateCard[]> {
    return db
      .select()
      .from(countryRateCards)
      .where(eq(countryRateCards.countryId, countryId))
      .orderBy(asc(countryRateCards.deploymentModel), asc(countryRateCards.direction));
  }

  async getRateCard(countryId: number, deploymentModel: string, direction: string, numberType: string): Promise<CountryRateCard | undefined> {
    const [card] = await db
      .select()
      .from(countryRateCards)
      .where(
        and(
          eq(countryRateCards.countryId, countryId),
          eq(countryRateCards.deploymentModel, deploymentModel),
          eq(countryRateCards.direction, direction),
          eq(countryRateCards.numberType, numberType),
        )
      );
    return card;
  }

  async upsertRateCard(data: InsertCountryRateCard): Promise<CountryRateCard> {
    const existing = await this.getRateCard(data.countryId, data.deploymentModel, data.direction, data.numberType);
    if (existing) {
      const [updated] = await db
        .update(countryRateCards)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(countryRateCards.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(countryRateCards).values(data).returning();
    return created;
  }

  async deleteRateCard(id: number): Promise<void> {
    await db.delete(countryRateCards).where(eq(countryRateCards.id, id));
  }

  async getHolidays(countryId: number, year?: number): Promise<CountryHoliday[]> {
    if (year) {
      return db
        .select()
        .from(countryHolidays)
        .where(
          and(
            eq(countryHolidays.countryId, countryId),
            eq(countryHolidays.year, year)
          )
        )
        .orderBy(asc(countryHolidays.date));
    }
    return db
      .select()
      .from(countryHolidays)
      .where(eq(countryHolidays.countryId, countryId))
      .orderBy(asc(countryHolidays.date));
  }

  async createHoliday(data: InsertCountryHoliday): Promise<CountryHoliday> {
    const [created] = await db.insert(countryHolidays).values(data).returning();
    return created;
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(countryHolidays).where(eq(countryHolidays.id, id));
  }

  async getCampaigns(orgId: number): Promise<Campaign[]> {
    return db
      .select()
      .from(campaigns)
      .where(eq(campaigns.orgId, orgId))
      .orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async createCampaign(data: InsertCampaign): Promise<Campaign> {
    const [created] = await db.insert(campaigns).values(data).returning();
    return created;
  }

  async updateCampaign(id: number, data: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [updated] = await db
      .update(campaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return updated;
  }

  async getCampaignContacts(campaignId: number): Promise<CampaignContact[]> {
    return db
      .select()
      .from(campaignContacts)
      .where(eq(campaignContacts.campaignId, campaignId))
      .orderBy(desc(campaignContacts.createdAt));
  }

  async createCampaignContact(data: InsertCampaignContact): Promise<CampaignContact> {
    const [created] = await db.insert(campaignContacts).values(data).returning();
    return created;
  }

  async updateCampaignContact(id: number, data: Partial<InsertCampaignContact>): Promise<CampaignContact | undefined> {
    const [updated] = await db
      .update(campaignContacts)
      .set(data)
      .where(eq(campaignContacts.id, id))
      .returning();
    return updated;
  }

  async bulkCreateCampaignContacts(contacts: InsertCampaignContact[]): Promise<number> {
    if (contacts.length === 0) return 0;
    const result = await db.insert(campaignContacts).values(contacts).returning();
    return result.length;
  }

  async getConnectors(orgId: number): Promise<DataConnector[]> {
    return db
      .select()
      .from(dataConnectors)
      .where(
        and(
          eq(dataConnectors.orgId, orgId),
          isNull(dataConnectors.deletedAt)
        )
      )
      .orderBy(desc(dataConnectors.createdAt));
  }

  async getConnector(id: number, orgId: number): Promise<DataConnector | undefined> {
    const [connector] = await db
      .select()
      .from(dataConnectors)
      .where(
        and(
          eq(dataConnectors.id, id),
          eq(dataConnectors.orgId, orgId),
          isNull(dataConnectors.deletedAt)
        )
      );
    return connector;
  }

  async createConnector(data: InsertDataConnector): Promise<DataConnector> {
    const encryptedData = { ...data };
    if (encryptedData.encryptedCredentials) {
      encryptedData.encryptedCredentials = encrypt(encryptedData.encryptedCredentials);
    }
    if (encryptedData.oauthAccessToken) {
      encryptedData.oauthAccessToken = encrypt(encryptedData.oauthAccessToken);
    }
    if (encryptedData.oauthRefreshToken) {
      encryptedData.oauthRefreshToken = encrypt(encryptedData.oauthRefreshToken);
    }
    const [created] = await db.insert(dataConnectors).values(encryptedData).returning();
    return created;
  }

  async updateConnector(id: number, orgId: number, data: Partial<InsertDataConnector>): Promise<DataConnector | undefined> {
    const updateData = { ...data };
    if (updateData.encryptedCredentials) {
      updateData.encryptedCredentials = encrypt(updateData.encryptedCredentials);
    }
    if (updateData.oauthAccessToken) {
      updateData.oauthAccessToken = encrypt(updateData.oauthAccessToken);
    }
    if (updateData.oauthRefreshToken) {
      updateData.oauthRefreshToken = encrypt(updateData.oauthRefreshToken);
    }
    const [updated] = await db
      .update(dataConnectors)
      .set(updateData)
      .where(
        and(
          eq(dataConnectors.id, id),
          eq(dataConnectors.orgId, orgId),
          isNull(dataConnectors.deletedAt)
        )
      )
      .returning();
    return updated;
  }

  async updateConnectorTokens(id: number, orgId: number, tokens: { oauthAccessToken?: string; oauthRefreshToken?: string; oauthExpiresAt?: Date }): Promise<DataConnector | undefined> {
    const updateData: Record<string, unknown> = {};
    if (tokens.oauthAccessToken) {
      updateData.oauthAccessToken = encrypt(tokens.oauthAccessToken);
    }
    if (tokens.oauthRefreshToken) {
      updateData.oauthRefreshToken = encrypt(tokens.oauthRefreshToken);
    }
    if (tokens.oauthExpiresAt) {
      updateData.oauthExpiresAt = tokens.oauthExpiresAt;
    }
    const [updated] = await db
      .update(dataConnectors)
      .set(updateData)
      .where(
        and(
          eq(dataConnectors.id, id),
          eq(dataConnectors.orgId, orgId),
          isNull(dataConnectors.deletedAt)
        )
      )
      .returning();
    return updated;
  }

  async softDeleteConnector(id: number, orgId: number): Promise<void> {
    await db
      .update(dataConnectors)
      .set({ deletedAt: new Date(), status: "inactive" })
      .where(
        and(
          eq(dataConnectors.id, id),
          eq(dataConnectors.orgId, orgId),
          isNull(dataConnectors.deletedAt)
        )
      );
  }

  async getConnectorUsageStats(orgId: number): Promise<{ id: number; name: string; connectorType: string; totalLookups: number }[]> {
    const results = await db
      .select({
        id: dataConnectors.id,
        name: dataConnectors.name,
        connectorType: dataConnectors.connectorType,
        totalLookups: dataConnectors.totalLookups,
      })
      .from(dataConnectors)
      .where(
        and(
          eq(dataConnectors.orgId, orgId),
          isNull(dataConnectors.deletedAt)
        )
      )
      .orderBy(desc(dataConnectors.totalLookups));
    return results;
  }

  async recordConnectorInterest(orgId: number, userId: number, connectorType: string): Promise<ConnectorInterest> {
    const [created] = await db
      .insert(connectorInterest)
      .values({ orgId, userId, connectorType })
      .returning();
    return created;
  }

  async lockFunds(orgId: number, campaignId: number, amount: number): Promise<WalletTransaction> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const walletResult = await client.query(
        "SELECT id, balance, locked_balance FROM wallets WHERE org_id = $1 FOR UPDATE",
        [orgId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error("Wallet not found for this organisation");
      }

      const wallet = walletResult.rows[0];
      const balance = parseFloat(wallet.balance);
      const lockedBalance = parseFloat(wallet.locked_balance);
      const availableBalance = balance - lockedBalance;
      const minimumReserve = 5;

      if (availableBalance < amount + minimumReserve) {
        throw new Error(
          `Insufficient available balance. Available: £${availableBalance.toFixed(2)}, Required: £${(amount + minimumReserve).toFixed(2)} (including £${minimumReserve.toFixed(2)} minimum reserve)`
        );
      }

      const newLockedBalance = lockedBalance + amount;

      await client.query(
        "UPDATE wallets SET locked_balance = $1, updated_at = NOW() WHERE id = $2",
        [newLockedBalance.toFixed(2), wallet.id]
      );

      const txnResult = await client.query(
        `INSERT INTO wallet_transactions (org_id, type, amount, balance_before, balance_after, description, reference_type, reference_id, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          orgId,
          "fund_lock",
          amount.toFixed(2),
          balance.toFixed(2),
          balance.toFixed(2),
          `Funds locked for campaign #${campaignId}`,
          "campaign",
          String(campaignId),
          `fund_lock_${orgId}_${campaignId}_${Date.now()}`,
        ]
      );

      await client.query(
        "UPDATE campaigns SET locked_amount = $1, updated_at = NOW() WHERE id = $2",
        [amount.toFixed(2), campaignId]
      );

      await client.query("COMMIT");
      return txnResult.rows[0] as WalletTransaction;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async chargeLocked(orgId: number, campaignId: number, actualCost: number): Promise<WalletTransaction> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const walletResult = await client.query(
        "SELECT id, balance, locked_balance FROM wallets WHERE org_id = $1 FOR UPDATE",
        [orgId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error("Wallet not found for this organisation");
      }

      const wallet = walletResult.rows[0];
      const balance = parseFloat(wallet.balance);
      const lockedBalance = parseFloat(wallet.locked_balance);

      const campaignResult = await client.query(
        "SELECT locked_amount FROM campaigns WHERE id = $1 AND org_id = $2",
        [campaignId, orgId]
      );

      if (campaignResult.rows.length === 0) {
        throw new Error("Campaign not found");
      }

      const campaignLockedAmount = parseFloat(campaignResult.rows[0].locked_amount || "0");
      const newBalance = balance - actualCost;
      const newLockedBalance = lockedBalance - campaignLockedAmount;

      await client.query(
        "UPDATE wallets SET balance = $1, locked_balance = $2, updated_at = NOW() WHERE id = $3",
        [newBalance.toFixed(2), Math.max(0, newLockedBalance).toFixed(2), wallet.id]
      );

      const txnResult = await client.query(
        `INSERT INTO wallet_transactions (org_id, type, amount, balance_before, balance_after, description, reference_type, reference_id, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          orgId,
          "fund_charge",
          (-actualCost).toFixed(2),
          balance.toFixed(2),
          newBalance.toFixed(2),
          `Campaign #${campaignId} charged. Locked: £${campaignLockedAmount.toFixed(2)}, Actual: £${actualCost.toFixed(2)}, Refunded excess: £${(campaignLockedAmount - actualCost).toFixed(2)}`,
          "campaign",
          String(campaignId),
          `fund_charge_${orgId}_${campaignId}_${Date.now()}`,
        ]
      );

      await client.query("COMMIT");
      return txnResult.rows[0] as WalletTransaction;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async releaseAllLocked(orgId: number, campaignId: number): Promise<WalletTransaction> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const walletResult = await client.query(
        "SELECT id, balance, locked_balance FROM wallets WHERE org_id = $1 FOR UPDATE",
        [orgId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error("Wallet not found for this organisation");
      }

      const wallet = walletResult.rows[0];
      const balance = parseFloat(wallet.balance);
      const lockedBalance = parseFloat(wallet.locked_balance);

      const campaignResult = await client.query(
        "SELECT locked_amount FROM campaigns WHERE id = $1 AND org_id = $2",
        [campaignId, orgId]
      );

      if (campaignResult.rows.length === 0) {
        throw new Error("Campaign not found");
      }

      const campaignLockedAmount = parseFloat(campaignResult.rows[0].locked_amount || "0");
      const newLockedBalance = lockedBalance - campaignLockedAmount;

      await client.query(
        "UPDATE wallets SET locked_balance = $1, updated_at = NOW() WHERE id = $2",
        [Math.max(0, newLockedBalance).toFixed(2), wallet.id]
      );

      await client.query(
        "UPDATE campaigns SET locked_amount = '0', updated_at = NOW() WHERE id = $1",
        [campaignId]
      );

      const txnResult = await client.query(
        `INSERT INTO wallet_transactions (org_id, type, amount, balance_before, balance_after, description, reference_type, reference_id, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          orgId,
          "fund_release",
          campaignLockedAmount.toFixed(2),
          balance.toFixed(2),
          balance.toFixed(2),
          `Funds released for cancelled campaign #${campaignId}`,
          "campaign",
          String(campaignId),
          `fund_release_${orgId}_${campaignId}_${Date.now()}`,
        ]
      );

      await client.query("COMMIT");
      return txnResult.rows[0] as WalletTransaction;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async releaseExcessLocked(orgId: number, campaignId: number, excessAmount: number): Promise<WalletTransaction> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const walletResult = await client.query(
        "SELECT id, balance, locked_balance FROM wallets WHERE org_id = $1 FOR UPDATE",
        [orgId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error("Wallet not found for this organisation");
      }

      const wallet = walletResult.rows[0];
      const balance = parseFloat(wallet.balance);
      const lockedBalance = parseFloat(wallet.locked_balance);
      const newLockedBalance = lockedBalance - excessAmount;

      await client.query(
        "UPDATE wallets SET locked_balance = $1, updated_at = NOW() WHERE id = $2",
        [Math.max(0, newLockedBalance).toFixed(2), wallet.id]
      );

      const campaignResult = await client.query(
        "SELECT locked_amount FROM campaigns WHERE id = $1 AND org_id = $2",
        [campaignId, orgId]
      );

      if (campaignResult.rows.length === 0) {
        throw new Error("Campaign not found");
      }

      const campaignLockedAmount = parseFloat(campaignResult.rows[0].locked_amount || "0");
      const newCampaignLocked = campaignLockedAmount - excessAmount;

      await client.query(
        "UPDATE campaigns SET locked_amount = $1, updated_at = NOW() WHERE id = $2",
        [Math.max(0, newCampaignLocked).toFixed(2), campaignId]
      );

      const txnResult = await client.query(
        `INSERT INTO wallet_transactions (org_id, type, amount, balance_before, balance_after, description, reference_type, reference_id, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          orgId,
          "fund_partial_release",
          excessAmount.toFixed(2),
          balance.toFixed(2),
          balance.toFixed(2),
          `Partial fund release of £${excessAmount.toFixed(2)} for campaign #${campaignId}`,
          "campaign",
          String(campaignId),
          `fund_partial_release_${orgId}_${campaignId}_${Date.now()}`,
        ]
      );

      await client.query("COMMIT");
      return txnResult.rows[0] as WalletTransaction;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getLockedFundsBreakdown(orgId: number): Promise<{ campaignId: number; campaignName: string; lockedAmount: string }[]> {
    const results = await db
      .select({
        campaignId: campaigns.id,
        campaignName: campaigns.name,
        lockedAmount: campaigns.lockedAmount,
      })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.orgId, orgId),
          sql`${campaigns.lockedAmount} IS NOT NULL AND CAST(${campaigns.lockedAmount} AS numeric) > 0`,
          sql`${campaigns.status} IN ('approved', 'running', 'paused')`
        )
      )
      .orderBy(desc(campaigns.createdAt));

    return results.map((r) => ({
      campaignId: r.campaignId,
      campaignName: r.campaignName,
      lockedAmount: r.lockedAmount || "0",
    }));
  }

  async approveCampaign(id: number, orgId: number, userId: number): Promise<Campaign> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const campaignResult = await client.query(
        "SELECT * FROM campaigns WHERE id = $1 AND org_id = $2 FOR UPDATE",
        [id, orgId]
      );

      if (campaignResult.rows.length === 0) {
        throw new Error("Campaign not found");
      }

      const campaign = campaignResult.rows[0];

      if (campaign.approved_at) {
        await client.query("COMMIT");
        const [existing] = await db.select().from(campaigns).where(eq(campaigns.id, id));
        return existing;
      }

      if (!campaign.consent_confirmed) {
        throw new Error("Consent must be confirmed before approving a campaign");
      }

      const estimatedCost = parseFloat(campaign.estimated_cost || "0");
      if (estimatedCost <= 0) {
        throw new Error("Campaign must have a valid estimated cost before approval");
      }

      const walletResult = await client.query(
        "SELECT id, balance, locked_balance FROM wallets WHERE org_id = $1 FOR UPDATE",
        [orgId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error("Wallet not found for this organisation");
      }

      const wallet = walletResult.rows[0];
      const balance = parseFloat(wallet.balance);
      const lockedBalance = parseFloat(wallet.locked_balance);
      const availableBalance = balance - lockedBalance;
      const minimumReserve = 5;

      if (availableBalance < estimatedCost + minimumReserve) {
        throw new Error(
          `Insufficient available balance. Available: £${availableBalance.toFixed(2)}, Required: £${(estimatedCost + minimumReserve).toFixed(2)} (including £${minimumReserve.toFixed(2)} minimum reserve)`
        );
      }

      const newLockedBalance = lockedBalance + estimatedCost;

      await client.query(
        "UPDATE wallets SET locked_balance = $1, updated_at = NOW() WHERE id = $2",
        [newLockedBalance.toFixed(2), wallet.id]
      );

      await client.query(
        `INSERT INTO wallet_transactions (org_id, type, amount, balance_before, balance_after, description, reference_type, reference_id, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          orgId,
          "fund_lock",
          estimatedCost.toFixed(2),
          balance.toFixed(2),
          balance.toFixed(2),
          `Funds locked for campaign #${id} approval`,
          "campaign",
          String(id),
          `fund_lock_approve_${orgId}_${id}_${Date.now()}`,
        ]
      );

      const updateResult = await client.query(
        `UPDATE campaigns SET 
          locked_amount = $1,
          approved_at = NOW(),
          approved_by = $2,
          status = 'approved',
          updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [estimatedCost.toFixed(2), userId, id]
      );

      await client.query("COMMIT");

      const [approved] = await db.select().from(campaigns).where(eq(campaigns.id, id));
      return approved;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

export const storage = new DatabaseStorage();
