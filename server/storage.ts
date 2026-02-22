import { db } from "./db";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import {
  users, type InsertUser, type User,
  countries, type Country, type InsertCountry,
  countryComplianceProfiles, type CountryComplianceProfile, type InsertCountryComplianceProfile,
  countryRateCards, type CountryRateCard, type InsertCountryRateCard,
  countryHolidays, type CountryHoliday, type InsertCountryHoliday,
  campaigns, type Campaign, type InsertCampaign,
  campaignContacts, type CampaignContact, type InsertCampaignContact,
} from "@shared/schema";

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

}

export const storage = new DatabaseStorage();
