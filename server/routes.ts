import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db, pool } from "./db";
import { handleRouteError } from "./error-handler";
import {
  insertCountrySchema,
  insertCountryComplianceProfileSchema,
  insertCountryRateCardSchema,
  insertCountryHolidaySchema,
  insertCampaignSchema,
  insertCampaignContactSchema,
  insertDataConnectorSchema,
  connectorTypeEnum,
  wallets,
  campaigns,
  campaignContacts,
} from "@shared/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";
import { z } from "zod";
import { maskKey, decrypt } from "../lib/encryption";
import * as googleOAuth from "../lib/oauth-google";
import * as hubspotOAuth from "../lib/oauth-hubspot";
import multer from "multer";
import { parse as csvParse } from "csv-parse/sync";
import * as XLSX from "xlsx";

function mapCompanyType(raw: string): string {
  const typeMap: Record<string, string> = {
    ltd: "Ltd",
    "private-limited-guarant-nsc-limited-exemption": "Ltd",
    "private-limited-guarant-nsc": "Ltd",
    "private-limited-shares-section-30-exemption": "Ltd",
    "private-unlimited": "Ltd",
    "private-unlimited-nsc": "Ltd",
    plc: "PLC",
    "public-limited-company": "PLC",
    llp: "LLP",
    "limited-liability-partnership": "LLP",
    "limited-partnership": "LP",
    "scottish-partnership": "Partnership",
    "registered-society-non-jurisdictional": "Society",
    "industrial-and-provident-society": "Society",
    "royal-charter": "Royal Charter",
    "registered-overseas-entity": "Overseas",
    "overseas-company": "Overseas",
    "charitable-incorporated-organisation": "CIO",
    "scottish-charitable-incorporated-organisation": "CIO",
    "community-interest-company": "CIC",
  };
  return typeMap[raw] || raw.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateMockCompaniesHouseResults(query: string, includeInactive: boolean) {
  const mockCompanies = [
    {
      companyNumber: "12345678",
      companyName: `${query} Solutions Ltd`,
      entityType: "Ltd",
      companyTypeRaw: "ltd",
      registeredAddress: "10 Downing Street, London, SW1A 2AA",
      incorporationDate: "2019-03-15",
      status: "active",
      sicCodes: ["62012"],
    },
    {
      companyNumber: "87654321",
      companyName: `${query} Group PLC`,
      entityType: "PLC",
      companyTypeRaw: "plc",
      registeredAddress: "1 Canada Square, Canary Wharf, London, E14 5AB",
      incorporationDate: "2015-07-22",
      status: "active",
      sicCodes: ["70100"],
    },
    {
      companyNumber: "11223344",
      companyName: `${query} & Partners LLP`,
      entityType: "LLP",
      companyTypeRaw: "llp",
      registeredAddress: "50 Broadway, Westminster, London, SW1H 0BL",
      incorporationDate: "2020-01-10",
      status: "active",
      sicCodes: ["69201"],
    },
    {
      companyNumber: "55667788",
      companyName: `${query} Trading Ltd`,
      entityType: "Ltd",
      companyTypeRaw: "ltd",
      registeredAddress: "100 High Street, Manchester, M1 1AA",
      incorporationDate: "2021-11-05",
      status: "active",
      sicCodes: ["47910"],
    },
    {
      companyNumber: "99001122",
      companyName: `${query} Ventures Ltd`,
      entityType: "Ltd",
      companyTypeRaw: "ltd",
      registeredAddress: "25 Queen Street, Edinburgh, EH2 1JX",
      incorporationDate: "2010-06-30",
      status: "dissolved",
      sicCodes: ["64205"],
    },
  ];

  return includeInactive ? mockCompanies : mockCompanies.filter((c) => c.status === "active");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {

  app.get("/api/health", async (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  });

  app.get("/api/health/ready", async (_req, res) => {
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      res.json({ status: "ready", database: "connected" });
    } catch {
      res.status(503).json({ status: "not_ready", database: "disconnected" });
    }
  });

  app.get("/api/health/live", (_req, res) => {
    res.json({ status: "alive" });
  });

  app.get("/api/countries", async (_req, res) => {
    try {
      const result = await storage.getCountries();
      res.json(result);
    } catch (err) {
      handleRouteError(err, res, "GET /api/countries");
    }
  });

  app.get("/api/countries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const country = await storage.getCountry(id);
      if (!country) return res.status(404).json({ error: "Country not found" });
      const compliance = await storage.getComplianceProfile(id);
      const rateCards = await storage.getRateCards(id);
      const holidays = await storage.getHolidays(id);
      res.json({ ...country, compliance, rateCards, holidays });
    } catch (err) {
      handleRouteError(err, res, "GET /api/countries/:id");
    }
  });

  app.post("/api/countries", async (req, res) => {
    try {
      const parsed = insertCountrySchema.parse(req.body);
      const country = await storage.createCountry(parsed);
      res.status(201).json(country);
    } catch (err) {
      handleRouteError(err, res, "POST /api/countries");
    }
  });

  app.patch("/api/countries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateCountry(id, req.body);
      if (!updated) return res.status(404).json({ error: "Country not found" });
      res.json(updated);
    } catch (err) {
      handleRouteError(err, res, "PATCH /api/countries/:id");
    }
  });

  app.get("/api/countries/:id/compliance", async (req, res) => {
    try {
      const countryId = parseInt(req.params.id);
      const profile = await storage.getComplianceProfile(countryId);
      if (!profile) return res.status(404).json({ error: "Compliance profile not found" });
      res.json(profile);
    } catch (err) {
      handleRouteError(err, res, "GET /api/countries/:id/compliance");
    }
  });

  app.put("/api/countries/:id/compliance", async (req, res) => {
    try {
      const countryId = parseInt(req.params.id);
      const data = { ...req.body, countryId };
      const profile = await storage.upsertComplianceProfile(data);
      res.json(profile);
    } catch (err) {
      handleRouteError(err, res, "PUT /api/countries/:id/compliance");
    }
  });

  app.get("/api/countries/:id/rate-cards", async (req, res) => {
    try {
      const countryId = parseInt(req.params.id);
      const cards = await storage.getRateCards(countryId);
      res.json(cards);
    } catch (err) {
      handleRouteError(err, res, "GET /api/countries/:id/rate-cards");
    }
  });

  app.put("/api/countries/:id/rate-cards", async (req, res) => {
    try {
      const countryId = parseInt(req.params.id);
      const data = { ...req.body, countryId };
      const card = await storage.upsertRateCard(data);
      res.json(card);
    } catch (err) {
      handleRouteError(err, res, "PUT /api/countries/:id/rate-cards");
    }
  });

  app.delete("/api/rate-cards/:id", async (req, res) => {
    try {
      await storage.deleteRateCard(parseInt(req.params.id));
      res.status(204).send();
    } catch (err) {
      handleRouteError(err, res, "DELETE /api/rate-cards/:id");
    }
  });

  app.get("/api/countries/:id/holidays", async (req, res) => {
    try {
      const countryId = parseInt(req.params.id);
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const holidays = await storage.getHolidays(countryId, year);
      res.json(holidays);
    } catch (err) {
      handleRouteError(err, res, "GET /api/countries/:id/holidays");
    }
  });

  app.post("/api/countries/:id/holidays", async (req, res) => {
    try {
      const countryId = parseInt(req.params.id);
      const data = { ...req.body, countryId };
      const parsed = insertCountryHolidaySchema.parse(data);
      const holiday = await storage.createHoliday(parsed);
      res.status(201).json(holiday);
    } catch (err) {
      handleRouteError(err, res, "POST /api/countries/:id/holidays");
    }
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    try {
      await storage.deleteHoliday(parseInt(req.params.id));
      res.status(204).send();
    } catch (err) {
      handleRouteError(err, res, "DELETE /api/holidays/:id");
    }
  });

  app.get("/api/campaigns", async (req, res) => {
    try {
      const orgId = parseInt(req.query.orgId as string) || 1;
      const result = await storage.getCampaigns(orgId);
      res.json(result);
    } catch (err) {
      handleRouteError(err, res, "GET /api/campaigns");
    }
  });

  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(parseInt(req.params.id));
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });
      res.json(campaign);
    } catch (err) {
      handleRouteError(err, res, "GET /api/campaigns/:id");
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const parsed = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(parsed);
      res.status(201).json(campaign);
    } catch (err) {
      handleRouteError(err, res, "POST /api/campaigns");
    }
  });

  app.patch("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateCampaign(id, req.body);
      if (!updated) return res.status(404).json({ error: "Campaign not found" });
      res.json(updated);
    } catch (err) {
      handleRouteError(err, res, "PATCH /api/campaigns/:id");
    }
  });

  app.get("/api/campaigns/:id/contacts", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const contacts = await storage.getCampaignContacts(campaignId);
      res.json(contacts);
    } catch (err) {
      handleRouteError(err, res, "GET /api/campaigns/:id/contacts");
    }
  });

  app.post("/api/campaigns/:id/contacts", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      if (Array.isArray(req.body)) {
        const contacts = req.body.map((c: any) => ({ ...c, campaignId }));
        const count = await storage.bulkCreateCampaignContacts(contacts);
        res.status(201).json({ created: count });
      } else {
        const data = { ...req.body, campaignId };
        const contact = await storage.createCampaignContact(data);
        res.status(201).json(contact);
      }
    } catch (err) {
      handleRouteError(err, res, "POST /api/campaigns/:id/contacts");
    }
  });

  app.patch("/api/campaign-contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateCampaignContact(id, req.body);
      if (!updated) return res.status(404).json({ error: "Contact not found" });
      res.json(updated);
    } catch (err) {
      handleRouteError(err, res, "PATCH /api/campaign-contacts/:id");
    }
  });

  app.get("/api/rate-resolver", async (req, res) => {
    try {
      const { countryCode, deploymentModel, direction, numberType } = req.query;
      if (!countryCode || !deploymentModel) {
        return res.status(400).json({ error: "countryCode and deploymentModel are required" });
      }
      const country = await storage.getCountryByCode(countryCode as string);
      if (!country) return res.status(404).json({ error: "Country not found" });

      const card = await storage.getRateCard(
        country.id,
        deploymentModel as string,
        (direction as string) || "outbound",
        (numberType as string) || "mobile"
      );
      if (!card) return res.status(404).json({ error: "Rate card not found" });

      res.json({
        country: country.name,
        isoCode: country.isoCode,
        currency: country.currency,
        ...card,
      });
    } catch (err) {
      handleRouteError(err, res, "GET /api/rate-resolver");
    }
  });

  // ============================================================
  // Connector Routes
  // ============================================================

  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  function checkRateLimit(key: string, maxCount: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= maxCount) return false;
    entry.count++;
    return true;
  }

  function maskConnector(connector: any) {
    const masked = { ...connector };
    if (masked.encryptedCredentials) {
      const decrypted = decrypt(masked.encryptedCredentials);
      masked.encryptedCredentials = decrypted ? maskKey(decrypted) : "••••";
    }
    if (masked.oauthAccessToken) masked.oauthAccessToken = "••••";
    if (masked.oauthRefreshToken) masked.oauthRefreshToken = "••••";
    return masked;
  }

  app.get("/api/connectors", async (req, res) => {
    try {
      const orgId = parseInt(req.query.orgId as string) || 1;
      const connectors = await storage.getConnectors(orgId);
      res.json(connectors.map(maskConnector));
    } catch (err) {
      handleRouteError(err, res, "GET /api/connectors");
    }
  });

  app.post("/api/connectors", async (req, res) => {
    try {
      const parsed = insertDataConnectorSchema.parse(req.body);
      const connector = await storage.createConnector(parsed);
      res.status(201).json(maskConnector(connector));
    } catch (err) {
      handleRouteError(err, res, "POST /api/connectors");
    }
  });

  app.patch("/api/connectors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.query.orgId as string) || 1;
      const updated = await storage.updateConnector(id, orgId, req.body);
      if (!updated) return res.status(404).json({ error: "Connector not found" });
      res.json(maskConnector(updated));
    } catch (err) {
      handleRouteError(err, res, "PATCH /api/connectors/:id");
    }
  });

  app.delete("/api/connectors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.query.orgId as string) || 1;
      const connector = await storage.getConnector(id, orgId);
      if (!connector) return res.status(404).json({ error: "Connector not found" });
      await storage.softDeleteConnector(id, orgId);
      res.json({ message: "Connector disconnected" });
    } catch (err) {
      handleRouteError(err, res, "DELETE /api/connectors/:id");
    }
  });

  app.post("/api/connectors/:id/test", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.query.orgId as string) || 1;
      const userId = parseInt(req.query.userId as string) || 1;

      if (!checkRateLimit(`test_${userId}`, 5, 60000)) {
        return res.status(429).json({ error: "Too many test requests. Please wait a minute and try again." });
      }

      const connector = await storage.getConnector(id, orgId);
      if (!connector) return res.status(404).json({ error: "Connector not found" });

      let testResult = { success: true, message: "Connection successful" };

      if (connector.encryptedCredentials) {
        const decrypted = decrypt(connector.encryptedCredentials);
        if (!decrypted) {
          testResult = { success: false, message: "Failed to decrypt credentials. Please re-enter your API key." };
        }
      }

      await storage.updateConnector(id, orgId, {
        lastTestedAt: new Date(),
        status: testResult.success ? "active" : "error",
        lastErrorMessage: testResult.success ? null : testResult.message,
      } as any);

      res.json(testResult);
    } catch (err) {
      handleRouteError(err, res, "POST /api/connectors/:id/test");
    }
  });

  app.get("/api/connectors/:id/search", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.query.orgId as string) || 1;
      const userId = parseInt(req.query.userId as string) || 1;
      const query = req.query.q as string;

      if (!checkRateLimit(`search_${userId}`, 60, 300000)) {
        return res.status(429).json({ error: "Too many searches. Please wait a moment and try again." });
      }

      const connector = await storage.getConnector(id, orgId);
      if (!connector) return res.status(404).json({ error: "Connector not found" });

      await storage.updateConnector(id, orgId, {
        totalLookups: (connector.totalLookups || 0) + 1,
      } as any);

      res.json({ results: [], message: "Search completed", query });
    } catch (err) {
      handleRouteError(err, res, "GET /api/connectors/:id/search");
    }
  });

  app.get("/api/connectors/usage", async (req, res) => {
    try {
      const orgId = parseInt(req.query.orgId as string) || 1;
      const stats = await storage.getConnectorUsageStats(orgId);
      res.json(stats);
    } catch (err) {
      handleRouteError(err, res, "GET /api/connectors/usage");
    }
  });

  app.post("/api/connectors/interest", async (req, res) => {
    try {
      const schema = z.object({
        orgId: z.number(),
        userId: z.number(),
        connectorType: connectorTypeEnum,
      });
      const parsed = schema.parse(req.body);
      const interest = await storage.recordConnectorInterest(parsed.orgId, parsed.userId, parsed.connectorType);
      res.status(201).json(interest);
    } catch (err) {
      handleRouteError(err, res, "POST /api/connectors/interest");
    }
  });

  // ============================================================
  // Campaign Enhancement Routes
  // ============================================================

  app.post("/api/campaigns/:id/estimate", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      const contacts = await storage.getCampaignContacts(campaignId);
      const contactCount = contacts.length;

      const avgCallCostPerContact = 0.25;
      const tpsCheckCostPerContact = 0.01;

      let orchestrationFee = 0;
      if (contactCount >= 1 && contactCount <= 10) {
        orchestrationFee = 0;
      } else if (contactCount >= 11 && contactCount <= 50) {
        orchestrationFee = 0.50;
      } else if (contactCount >= 51 && contactCount <= 200) {
        orchestrationFee = 1.00;
      } else if (contactCount > 200) {
        orchestrationFee = 2.50;
      }

      const callCosts = contactCount * avgCallCostPerContact;
      const tpsCosts = contactCount * tpsCheckCostPerContact;
      const totalEstimate = callCosts + tpsCosts + orchestrationFee;

      await storage.updateCampaign(campaignId, {
        estimatedCost: totalEstimate.toFixed(2),
      } as any);

      res.json({
        contactCount,
        breakdown: {
          callCosts: callCosts.toFixed(2),
          avgCallCostPerContact: avgCallCostPerContact.toFixed(2),
          tpsCosts: tpsCosts.toFixed(2),
          tpsCheckCostPerContact: tpsCheckCostPerContact.toFixed(2),
          orchestrationFee: orchestrationFee.toFixed(2),
        },
        totalEstimate: totalEstimate.toFixed(2),
        currency: "GBP",
      });
    } catch (err) {
      handleRouteError(err, res, "POST /api/campaigns/:id/estimate");
    }
  });

  app.post("/api/campaigns/:id/approve", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const orgId = parseInt(req.query.orgId as string) || 1;
      const userId = parseInt(req.query.userId as string) || 1;

      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      if (!campaign.consentConfirmed) {
        return res.status(400).json({ error: "Consent must be confirmed before approving a campaign. Set consentConfirmed to true." });
      }

      const approved = await storage.approveCampaign(campaignId, orgId, userId);
      res.json(approved);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Insufficient")) {
        return res.status(400).json({ error: err.message });
      }
      handleRouteError(err, res, "POST /api/campaigns/:id/approve");
    }
  });

  app.post("/api/campaigns/:id/pause", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      if (campaign.status !== "running" && campaign.status !== "approved") {
        return res.status(400).json({ error: `Cannot pause a campaign with status "${campaign.status}". Only running or approved campaigns can be paused.` });
      }

      const updated = await storage.updateCampaign(campaignId, {
        status: "paused",
        pausedAt: new Date(),
        pausedReason: req.body.reason || "Manually paused",
      } as any);

      res.json(updated);
    } catch (err) {
      handleRouteError(err, res, "POST /api/campaigns/:id/pause");
    }
  });

  app.post("/api/campaigns/:id/resume", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      if (campaign.status !== "paused") {
        return res.status(400).json({ error: `Cannot resume a campaign with status "${campaign.status}". Only paused campaigns can be resumed.` });
      }

      const updated = await storage.updateCampaign(campaignId, {
        status: "running",
        pausedAt: null,
        pausedReason: null,
      } as any);

      res.json(updated);
    } catch (err) {
      handleRouteError(err, res, "POST /api/campaigns/:id/resume");
    }
  });

  app.post("/api/campaigns/:id/extend", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const orgId = parseInt(req.query.orgId as string) || 1;

      const schema = z.object({ additionalAmount: z.number().positive() });
      const { additionalAmount } = schema.parse(req.body);

      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      const txn = await storage.lockFunds(orgId, campaignId, additionalAmount);

      const currentLocked = parseFloat(campaign.lockedAmount || "0");
      await storage.updateCampaign(campaignId, {
        lockedAmount: (currentLocked + additionalAmount).toFixed(2),
        costCapReached: false,
        status: campaign.status === "paused" ? "running" : campaign.status,
        pausedAt: campaign.status === "paused" ? null : campaign.pausedAt,
        pausedReason: campaign.status === "paused" ? null : campaign.pausedReason,
      } as any);

      res.json({ message: "Additional funds locked", additionalAmount, transaction: txn });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Insufficient")) {
        return res.status(400).json({ error: err.message });
      }
      handleRouteError(err, res, "POST /api/campaigns/:id/extend");
    }
  });

  app.get("/api/campaigns/:id/progress", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      const contacts = await storage.getCampaignContacts(campaignId);

      const completed = contacts.filter(c => c.status === "completed").length;
      const failed = contacts.filter(c => c.status === "failed").length;
      const skipped = contacts.filter(c => c.status === "skipped" || c.status === "dnc_blocked").length;
      const pending = contacts.filter(c => c.status === "pending" || c.status === "queued").length;
      const inProgress = contacts.filter(c => c.status === "in_progress" || c.status === "calling").length;

      const totalContacts = contacts.length;
      const processedCount = completed + failed + skipped;
      const progressPercent = totalContacts > 0 ? Math.round((processedCount / totalContacts) * 100) : 0;

      const budgetSpent = parseFloat(campaign.budgetSpent || "0");
      const estimatedCost = parseFloat(campaign.estimatedCost || "0");
      const lockedAmount = parseFloat(campaign.lockedAmount || "0");

      let estimatedTimeRemainingMinutes: number | null = null;
      if (processedCount > 0 && campaign.startedAt) {
        const elapsedMs = Date.now() - new Date(campaign.startedAt).getTime();
        const msPerContact = elapsedMs / processedCount;
        estimatedTimeRemainingMinutes = Math.round((pending * msPerContact) / 60000);
      }

      res.json({
        campaignId,
        status: campaign.status,
        totalContacts,
        completed,
        failed,
        skipped,
        pending,
        inProgress,
        progressPercent,
        budgetSpent: budgetSpent.toFixed(2),
        estimatedCost: estimatedCost.toFixed(2),
        lockedAmount: lockedAmount.toFixed(2),
        costCapReached: campaign.costCapReached || false,
        estimatedTimeRemainingMinutes,
      });
    } catch (err) {
      handleRouteError(err, res, "GET /api/campaigns/:id/progress");
    }
  });

  app.get("/api/campaigns/:id/export", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      const contacts = await storage.getCampaignContacts(campaignId);

      const csvHeader = "Contact Name,Phone Number,Status,Attempt Count,Last Disposition,Completed At\n";
      const csvRows = contacts.map(c => {
        const name = (c.contactName || "").replace(/,/g, " ");
        const phone = c.phoneNumberE164 || c.phoneNumber;
        const status = c.status;
        const attempts = c.attemptCount || 0;
        const disposition = (c.lastCallDisposition || "").replace(/,/g, " ");
        const completedAt = c.completedAt ? new Date(c.completedAt).toISOString() : "";
        return `${name},${phone},${status},${attempts},${disposition},${completedAt}`;
      }).join("\n");

      const csv = csvHeader + csvRows;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="campaign-${campaignId}-results.csv"`);
      res.send(csv);
    } catch (err) {
      handleRouteError(err, res, "GET /api/campaigns/:id/export");
    }
  });

  // ============================================================
  // Companies House Connector (Built-in, Free)
  // ============================================================

  app.post("/api/connectors/companies-house/search", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string) || 1;

      if (!checkRateLimit(`companies_house_${userId}`, 60, 300000)) {
        return res.status(429).json({ error: "Too many searches. Please wait a moment and try again." });
      }

      const searchSchema = z.object({
        query: z.string().min(1, "Search query is required"),
        location: z.string().optional(),
        sicCode: z.string().optional(),
        includeInactive: z.boolean().optional().default(false),
        itemsPerPage: z.number().optional().default(20),
        startIndex: z.number().optional().default(0),
      });

      const parsed = searchSchema.parse(req.body);
      const apiKey = process.env.COMPANIES_HOUSE_API_KEY;

      if (!apiKey) {
        const mockResults = generateMockCompaniesHouseResults(parsed.query, parsed.includeInactive);
        return res.json({
          results: mockResults,
          totalResults: mockResults.length,
          query: parsed.query,
          source: "mock",
          message: "Companies House API key not configured. Showing sample results.",
        });
      }

      const searchParams = new URLSearchParams({
        q: parsed.query,
        items_per_page: String(parsed.itemsPerPage),
        start_index: String(parsed.startIndex),
      });

      const response = await fetch(
        `https://api.company-information.service.gov.uk/search/companies?${searchParams}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
          },
        }
      );

      if (response.status === 429) {
        return res.status(429).json({ error: "Companies House rate limit reached. Please wait a moment and try again." });
      }

      if (!response.ok) {
        return res.status(502).json({ error: "Failed to search Companies House. Please try again." });
      }

      const data = await response.json() as {
        total_results?: number;
        items?: Array<{
          company_number?: string;
          title?: string;
          company_type?: string;
          company_status?: string;
          date_of_creation?: string;
          registered_office_address?: {
            address_line_1?: string;
            address_line_2?: string;
            locality?: string;
            region?: string;
            postal_code?: string;
            country?: string;
          };
          sic_codes?: string[];
        }>;
      };

      const items = (data.items || []).map((item) => {
        const addr = item.registered_office_address || {};
        const addressParts = [
          addr.address_line_1,
          addr.address_line_2,
          addr.locality,
          addr.region,
          addr.postal_code,
          addr.country,
        ].filter(Boolean);

        return {
          companyNumber: item.company_number || "",
          companyName: item.title || "",
          entityType: mapCompanyType(item.company_type || ""),
          companyTypeRaw: item.company_type || "",
          registeredAddress: addressParts.join(", "),
          incorporationDate: item.date_of_creation || null,
          status: item.company_status || "unknown",
          sicCodes: item.sic_codes || [],
        };
      });

      let filtered = items;
      if (!parsed.includeInactive) {
        filtered = items.filter((item) => item.status === "active");
      }

      if (parsed.location) {
        const loc = parsed.location.toLowerCase();
        filtered = filtered.filter((item) =>
          item.registeredAddress.toLowerCase().includes(loc)
        );
      }

      if (parsed.sicCode) {
        filtered = filtered.filter((item) =>
          item.sicCodes.some((sic: string) => sic.startsWith(parsed.sicCode!))
        );
      }

      res.json({
        results: filtered,
        totalResults: data.total_results || filtered.length,
        query: parsed.query,
        source: "companies_house",
      });
    } catch (err) {
      handleRouteError(err, res, "POST /api/connectors/companies-house/search");
    }
  });

  app.post("/api/connectors/companies-house/add-to-campaign", async (req, res) => {
    try {
      const addSchema = z.object({
        campaignId: z.number(),
        companies: z.array(z.object({
          companyNumber: z.string(),
          companyName: z.string(),
          entityType: z.string(),
          registeredAddress: z.string().optional(),
          status: z.string().optional(),
          sicCodes: z.array(z.string()).optional(),
        })),
      });

      const parsed = addSchema.parse(req.body);

      const campaign = await storage.getCampaign(parsed.campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      const contacts = parsed.companies.map((company) => ({
        campaignId: parsed.campaignId,
        contactName: company.companyName,
        phoneNumber: "",
        phoneNumberE164: "",
        email: "",
        company: company.companyName,
        metadata: {
          companyNumber: company.companyNumber,
          entityType: company.entityType,
          registeredAddress: company.registeredAddress || "",
          status: company.status || "",
          sicCodes: company.sicCodes || [],
          source: "companies_house",
        },
        status: "pending" as const,
        notes: `Companies House: ${company.entityType} (${company.companyNumber}). Phone numbers not available — add manually or from another source.`,
      }));

      const count = await storage.bulkCreateCampaignContacts(contacts);
      res.status(201).json({
        created: count,
        message: `${count} companies added to campaign. Note: Phone numbers are not available from Companies House. Add phone numbers manually or from another source.`,
      });
    } catch (err) {
      handleRouteError(err, res, "POST /api/connectors/companies-house/add-to-campaign");
    }
  });

  // ============================================================
  // CSV Upload + Manual Entry Routes
  // ============================================================

  const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
      ];
      const ext = file.originalname.toLowerCase();
      if (allowed.includes(file.mimetype) || ext.endsWith(".csv") || ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Please upload a CSV or Excel file."));
      }
    },
  });

  const PHONE_HEADER_VARIATIONS = [
    "phone", "phone number", "phonenumber", "phone_number",
    "mobile", "mobile number", "mobilenumber", "mobile_number",
    "tel", "telephone", "telephone number",
    "contact no", "contact no.", "contact number",
    "cell", "cell phone", "cellphone",
    "number", "fax",
  ];

  const NAME_HEADER_VARIATIONS = [
    "name", "full name", "fullname", "full_name",
    "contact name", "contact_name", "contactname",
    "first name", "firstname", "first_name",
    "person", "contact",
  ];

  const EMAIL_HEADER_VARIATIONS = [
    "email", "e-mail", "email address", "email_address",
    "emailaddress", "mail", "e mail",
  ];

  const COMPANY_HEADER_VARIATIONS = [
    "company", "company name", "companyname", "company_name",
    "business", "business name", "businessname", "business_name",
    "organisation", "organization", "org", "firm",
  ];

  function detectColumnMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());

    for (let i = 0; i < lowerHeaders.length; i++) {
      const h = lowerHeaders[i];
      if (!mapping.phone && PHONE_HEADER_VARIATIONS.includes(h)) {
        mapping.phone = headers[i];
      }
      if (!mapping.name && NAME_HEADER_VARIATIONS.includes(h)) {
        mapping.name = headers[i];
      }
      if (!mapping.email && EMAIL_HEADER_VARIATIONS.includes(h)) {
        mapping.email = headers[i];
      }
      if (!mapping.company && COMPANY_HEADER_VARIATIONS.includes(h)) {
        mapping.company = headers[i];
      }
    }

    return mapping;
  }

  function normalizePhoneE164(phone: string, defaultCountry: string = "GB"): { valid: boolean; e164: string; original: string } {
    const original = phone;
    let cleaned = phone.replace(/[\s\-\(\)\.\+]/g, "").replace(/^00/, "");

    if (!cleaned || !/^\d{7,15}$/.test(cleaned)) {
      return { valid: false, e164: "", original };
    }

    if (phone.startsWith("+")) {
      const digits = phone.replace(/[^\d+]/g, "");
      if (/^\+\d{10,15}$/.test(digits)) {
        return { valid: true, e164: digits, original };
      }
    }

    const countryPrefixes: Record<string, string> = {
      GB: "44", US: "1", AU: "61", CA: "1", IE: "353",
      DE: "49", FR: "33", ES: "34", IT: "39", NL: "31",
      IN: "91", ZA: "27", NZ: "64", SG: "65", HK: "852",
    };

    const prefix = countryPrefixes[defaultCountry.toUpperCase()] || "44";

    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }

    if (cleaned.startsWith(prefix)) {
      const e164 = "+" + cleaned;
      if (e164.length >= 10 && e164.length <= 16) {
        return { valid: true, e164, original };
      }
    }

    const e164 = "+" + prefix + cleaned;
    if (e164.length >= 10 && e164.length <= 16) {
      return { valid: true, e164, original };
    }

    return { valid: false, e164: "", original };
  }

  function parseFileToRows(buffer: Buffer, filename: string): { headers: string[]; rows: string[][]; error?: string } {
    const ext = filename.toLowerCase();

    if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
      try {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return { headers: [], rows: [], error: "No sheets found in the file." };
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
        if (data.length === 0) return { headers: [], rows: [], error: "The file appears to be empty." };
        const headers = (data[0] as string[]).map(h => String(h).trim());
        const rows = data.slice(1).map(row => (row as string[]).map(cell => String(cell).trim()));
        return { headers, rows };
      } catch {
        return { headers: [], rows: [], error: "Failed to parse Excel file. Please ensure it's a valid .xlsx or .xls file." };
      }
    }

    try {
      const content = buffer.toString("utf-8");
      const records = csvParse(content, {
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
      }) as string[][];
      if (records.length === 0) return { headers: [], rows: [], error: "The file appears to be empty." };
      const headers = records[0].map(h => String(h).trim());
      const rows = records.slice(1).map(row => row.map(cell => String(cell).trim()));
      return { headers, rows };
    } catch {
      return { headers: [], rows: [], error: "Failed to parse CSV file. Please ensure it uses comma separation." };
    }
  }

  app.post("/api/connectors/csv/upload", csvUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded. Please select a CSV or Excel file." });
      }

      const file = req.file as Express.Multer.File;
      const maxCsvSize = 10 * 1024 * 1024;
      const maxXlsxSize = 20 * 1024 * 1024;
      const isExcel = file.originalname.toLowerCase().endsWith(".xlsx") || file.originalname.toLowerCase().endsWith(".xls");

      if (!isExcel && file.size > maxCsvSize) {
        return res.status(400).json({ error: "File too large. Maximum 10MB for CSV files." });
      }
      if (isExcel && file.size > maxXlsxSize) {
        return res.status(400).json({ error: "File too large. Maximum 20MB for Excel files." });
      }

      const { headers, rows, error } = parseFileToRows(file.buffer, file.originalname);
      if (error) {
        return res.status(400).json({ error });
      }

      const maxRows = 10000;
      if (rows.length > maxRows) {
        return res.status(400).json({ error: `Too many rows. Maximum ${maxRows.toLocaleString()} rows allowed. Your file has ${rows.length.toLocaleString()} rows.` });
      }

      const hasHeaders = headers.some(h => {
        const lower = h.toLowerCase();
        return PHONE_HEADER_VARIATIONS.includes(lower)
          || NAME_HEADER_VARIATIONS.includes(lower)
          || EMAIL_HEADER_VARIATIONS.includes(lower)
          || COMPANY_HEADER_VARIATIONS.includes(lower);
      });

      const columnMapping = hasHeaders ? detectColumnMapping(headers) : {};

      const defaultCountry = (req.body?.defaultCountry as string) || "GB";
      const previewRows = rows.slice(0, 10);

      let validCount = 0;
      let invalidCount = 0;
      const invalidRows: { row: number; reason: string }[] = [];

      if (columnMapping.phone) {
        const phoneIdx = headers.indexOf(columnMapping.phone);
        if (phoneIdx >= 0) {
          for (let i = 0; i < rows.length; i++) {
            const phoneVal = rows[i][phoneIdx] || "";
            if (!phoneVal) {
              invalidCount++;
              if (invalidRows.length < 20) {
                invalidRows.push({ row: i + 2, reason: "Missing phone number" });
              }
            } else {
              const normalized = normalizePhoneE164(phoneVal, defaultCountry);
              if (normalized.valid) {
                validCount++;
              } else {
                invalidCount++;
                if (invalidRows.length < 20) {
                  invalidRows.push({ row: i + 2, reason: `Invalid phone number '${phoneVal}'` });
                }
              }
            }
          }
        }
      }

      res.json({
        filename: file.originalname,
        totalRows: rows.length,
        headers,
        headersDetected: hasHeaders,
        columnMapping,
        preview: previewRows,
        validation: {
          valid: validCount,
          invalid: invalidCount,
          invalidRows: invalidRows.slice(0, 20),
        },
        defaultCountry,
      });
    } catch (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File too large. Maximum 20MB for Excel, 10MB for CSV." });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      handleRouteError(err, res, "POST /api/connectors/csv/upload");
    }
  });

  app.post("/api/connectors/csv/confirm", async (req, res) => {
    try {
      const confirmSchema = z.object({
        campaignId: z.number(),
        orgId: z.number().default(1),
        headers: z.array(z.string()),
        rows: z.array(z.array(z.string())),
        columnMapping: z.object({
          phone: z.string().optional(),
          name: z.string().optional(),
          email: z.string().optional(),
          company: z.string().optional(),
        }),
        defaultCountry: z.string().default("GB"),
        skipInvalid: z.boolean().default(true),
        skipDuplicates: z.boolean().default(true),
        firstRowIsHeader: z.boolean().default(true),
      });

      const parsed = confirmSchema.parse(req.body);

      const campaign = await storage.getCampaign(parsed.campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      const { headers, rows, columnMapping, defaultCountry } = parsed;
      const phoneIdx = columnMapping.phone ? headers.indexOf(columnMapping.phone) : -1;
      const nameIdx = columnMapping.name ? headers.indexOf(columnMapping.name) : -1;
      const emailIdx = columnMapping.email ? headers.indexOf(columnMapping.email) : -1;
      const companyIdx = columnMapping.company ? headers.indexOf(columnMapping.company) : -1;

      if (phoneIdx < 0) {
        return res.status(400).json({ error: "Phone number column mapping is required." });
      }

      let existingPhones = new Set<string>();
      if (parsed.skipDuplicates) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentContacts = await db
          .select({ phone: campaignContacts.phoneNumberE164 })
          .from(campaignContacts)
          .where(
            and(
              eq(campaignContacts.orgId, parsed.orgId),
              gte(campaignContacts.createdAt, thirtyDaysAgo)
            )
          );
        existingPhones = new Set(recentContacts.map(c => c.phone));
      }

      const contacts: Array<{
        campaignId: number;
        orgId: number;
        phoneNumber: string;
        phoneNumberE164: string;
        contactName: string;
        contactEmail: string;
        contactMetadata: Record<string, unknown>;
        status: string;
      }> = [];
      const errors: Array<{ row: number; reason: string }> = [];
      let duplicateCount = 0;
      let skippedInvalid = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const phoneVal = phoneIdx >= 0 ? (row[phoneIdx] || "") : "";
        const nameVal = nameIdx >= 0 ? (row[nameIdx] || "") : "";
        const emailVal = emailIdx >= 0 ? (row[emailIdx] || "") : "";
        const companyVal = companyIdx >= 0 ? (row[companyIdx] || "") : "";

        if (!phoneVal) {
          if (parsed.skipInvalid) {
            skippedInvalid++;
            continue;
          }
          errors.push({ row: i + 2, reason: "Missing phone number" });
          continue;
        }

        const normalized = normalizePhoneE164(phoneVal, defaultCountry);
        if (!normalized.valid) {
          if (parsed.skipInvalid) {
            skippedInvalid++;
            continue;
          }
          errors.push({ row: i + 2, reason: `Invalid phone number '${phoneVal}'` });
          continue;
        }

        if (parsed.skipDuplicates && existingPhones.has(normalized.e164)) {
          duplicateCount++;
          continue;
        }

        existingPhones.add(normalized.e164);

        const metadata: Record<string, unknown> = { source: "csv_upload" };
        if (companyVal) metadata.company = companyVal;
        for (let j = 0; j < headers.length; j++) {
          if (j !== phoneIdx && j !== nameIdx && j !== emailIdx && j !== companyIdx) {
            if (row[j]) metadata[headers[j]] = row[j];
          }
        }

        contacts.push({
          campaignId: parsed.campaignId,
          orgId: parsed.orgId,
          phoneNumber: phoneVal,
          phoneNumberE164: normalized.e164,
          contactName: nameVal,
          contactEmail: emailVal,
          contactMetadata: metadata,
          status: "pending",
        });
      }

      let created = 0;
      if (contacts.length > 0) {
        created = await storage.bulkCreateCampaignContacts(contacts as any);
      }

      res.json({
        created,
        skippedInvalid,
        duplicatesSkipped: duplicateCount,
        errors: errors.slice(0, 50),
        totalProcessed: rows.length,
      });
    } catch (err) {
      handleRouteError(err, res, "POST /api/connectors/csv/confirm");
    }
  });

  app.post("/api/connectors/manual-entry", async (req, res) => {
    try {
      const manualSchema = z.object({
        campaignId: z.number(),
        orgId: z.number().default(1),
        defaultCountry: z.string().default("GB"),
        skipDuplicates: z.boolean().default(true),
        contacts: z.array(z.object({
          name: z.string().optional().default(""),
          phone: z.string().min(1, "Phone number is required"),
          email: z.string().optional().default(""),
          company: z.string().optional().default(""),
        })).min(1, "At least one contact is required").max(20, "Maximum 20 contacts per manual entry"),
      });

      const parsed = manualSchema.parse(req.body);

      const campaign = await storage.getCampaign(parsed.campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      let existingPhones = new Set<string>();
      if (parsed.skipDuplicates) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentContacts = await db
          .select({ phone: campaignContacts.phoneNumberE164 })
          .from(campaignContacts)
          .where(
            and(
              eq(campaignContacts.orgId, parsed.orgId),
              gte(campaignContacts.createdAt, thirtyDaysAgo)
            )
          );
        existingPhones = new Set(recentContacts.map(c => c.phone));
      }

      const validContacts: Array<{
        campaignId: number;
        orgId: number;
        phoneNumber: string;
        phoneNumberE164: string;
        contactName: string;
        contactEmail: string;
        contactMetadata: Record<string, unknown>;
        status: string;
      }> = [];
      const errors: Array<{ index: number; reason: string }> = [];
      let duplicateCount = 0;

      for (let i = 0; i < parsed.contacts.length; i++) {
        const c = parsed.contacts[i];
        const normalized = normalizePhoneE164(c.phone, parsed.defaultCountry);

        if (!normalized.valid) {
          errors.push({ index: i, reason: `Invalid phone number '${c.phone}'` });
          continue;
        }

        if (parsed.skipDuplicates && existingPhones.has(normalized.e164)) {
          duplicateCount++;
          continue;
        }

        existingPhones.add(normalized.e164);

        const metadata: Record<string, unknown> = { source: "manual_entry" };
        if (c.company) metadata.company = c.company;

        validContacts.push({
          campaignId: parsed.campaignId,
          orgId: parsed.orgId,
          phoneNumber: c.phone,
          phoneNumberE164: normalized.e164,
          contactName: c.name || "",
          contactEmail: c.email || "",
          contactMetadata: metadata,
          status: "pending",
        });
      }

      let created = 0;
      if (validContacts.length > 0) {
        created = await storage.bulkCreateCampaignContacts(validContacts as any);
      }

      res.json({
        created,
        duplicatesSkipped: duplicateCount,
        errors,
        totalSubmitted: parsed.contacts.length,
      });
    } catch (err) {
      handleRouteError(err, res, "POST /api/connectors/manual-entry");
    }
  });

  // ============================================================
  // Wallet Routes (enhanced with locked balance)
  // ============================================================

  app.get("/api/wallet", async (req, res) => {
    try {
      const orgId = parseInt(req.query.orgId as string) || 1;
      const [wallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.orgId, orgId));

      if (!wallet) return res.status(404).json({ error: "Wallet not found" });

      const balance = parseFloat(wallet.balance);
      const lockedBalance = parseFloat(wallet.lockedBalance);
      const availableBalance = balance - lockedBalance;

      res.json({
        ...wallet,
        availableBalance: availableBalance.toFixed(2),
      });
    } catch (err) {
      handleRouteError(err, res, "GET /api/wallet");
    }
  });

  app.get("/api/wallet/locks", async (req, res) => {
    try {
      const orgId = parseInt(req.query.orgId as string) || 1;
      const breakdown = await storage.getLockedFundsBreakdown(orgId);
      res.json(breakdown);
    } catch (err) {
      handleRouteError(err, res, "GET /api/wallet/locks");
    }
  });

  // ============================================================
  // OAuth Routes — Google Sheets
  // ============================================================

  app.get("/api/oauth/google/authorize", async (req, res) => {
    try {
      const orgId = parseInt(req.query.orgId as string) || 1;
      const userId = parseInt(req.query.userId as string) || 1;
      const returnUrl = (req.query.returnUrl as string) || "/dashboard/data-sources";

      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({ error: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
      }

      const authUrl = googleOAuth.getAuthorizationUrl(orgId, userId, returnUrl);
      res.redirect(authUrl);
    } catch (err) {
      handleRouteError(err, res, "GET /api/oauth/google/authorize");
    }
  });

  app.get("/api/oauth/google/callback", async (req, res) => {
    const fallbackUrl = "/dashboard/data-sources";
    try {
      const { code, state: stateStr, error: oauthError } = req.query;

      if (oauthError) {
        return res.redirect(`${fallbackUrl}?error=connection_failed`);
      }

      if (!stateStr || !code) {
        return res.redirect(`${fallbackUrl}?error=invalid_state`);
      }

      const state = googleOAuth.validateState(stateStr as string);
      if (!state) {
        return res.redirect(`${fallbackUrl}?error=invalid_state`);
      }

      const returnUrl = state.returnUrl || fallbackUrl;

      let tokens: googleOAuth.GoogleTokens;
      try {
        tokens = await googleOAuth.exchangeCodeForTokens(code as string);
      } catch {
        return res.redirect(`${returnUrl}?error=connection_failed`);
      }

      await storage.createConnector({
        orgId: state.orgId,
        userId: state.userId,
        connectorType: "google_sheets",
        name: tokens.email ? `Google Sheets (${tokens.email})` : "Google Sheets",
        authType: "oauth",
        oauthAccessToken: tokens.accessToken,
        oauthRefreshToken: tokens.refreshToken || undefined,
        oauthExpiresAt: tokens.expiresAt,
        oauthScopes: "spreadsheets.readonly,drive.metadata.readonly",
        oauthEmail: tokens.email,
        status: "active",
      });

      res.redirect(`${returnUrl}?connected=google_sheets`);
    } catch (err) {
      console.error("Google OAuth callback error:", err instanceof Error ? err.message : err);
      res.redirect(`${fallbackUrl}?error=connection_failed`);
    }
  });

  async function getValidGoogleToken(connector: any): Promise<string | null> {
    if (!connector.oauthAccessToken) return null;

    const decryptedAccess = decrypt(connector.oauthAccessToken);
    if (!decryptedAccess) return null;

    if (!googleOAuth.isTokenExpiringSoon(connector.oauthExpiresAt)) {
      return decryptedAccess;
    }

    if (!connector.oauthRefreshToken) return null;
    const decryptedRefresh = decrypt(connector.oauthRefreshToken);
    if (!decryptedRefresh) return null;

    try {
      const refreshed = await googleOAuth.refreshAccessToken(decryptedRefresh);
      await storage.updateConnectorTokens(connector.id, connector.orgId, {
        oauthAccessToken: refreshed.accessToken,
        oauthExpiresAt: refreshed.expiresAt,
      });
      return refreshed.accessToken;
    } catch (err) {
      if (err instanceof Error && err.message === "REVOKED") {
        await storage.updateConnector(connector.id, connector.orgId, {
          status: "disconnected",
          lastErrorMessage: "You've disconnected GoRigo from your Google account. Reconnect to continue.",
        } as any);
      }
      return null;
    }
  }

  app.post("/api/connectors/:id/google-sheets/list", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.query.orgId as string) || 1;

      const connector = await storage.getConnector(id, orgId);
      if (!connector) return res.status(404).json({ error: "Connector not found" });
      if (connector.connectorType !== "google_sheets") {
        return res.status(400).json({ error: "Connector is not a Google Sheets connector" });
      }

      const accessToken = await getValidGoogleToken(connector);
      if (!accessToken) {
        return res.status(401).json({ error: "Unable to access Google Sheets. Please reconnect your account.", reconnectRequired: true });
      }

      const spreadsheets = await googleOAuth.listSpreadsheets(accessToken);
      res.json({ spreadsheets });
    } catch (err) {
      handleRouteError(err, res, "POST /api/connectors/:id/google-sheets/list");
    }
  });

  app.post("/api/connectors/:id/google-sheets/preview", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.query.orgId as string) || 1;

      const schema = z.object({
        spreadsheetId: z.string().min(1),
        sheetName: z.string().optional(),
      });
      const { spreadsheetId, sheetName } = schema.parse(req.body);

      const connector = await storage.getConnector(id, orgId);
      if (!connector) return res.status(404).json({ error: "Connector not found" });
      if (connector.connectorType !== "google_sheets") {
        return res.status(400).json({ error: "Connector is not a Google Sheets connector" });
      }

      const accessToken = await getValidGoogleToken(connector);
      if (!accessToken) {
        return res.status(401).json({ error: "Unable to access Google Sheets. Please reconnect your account.", reconnectRequired: true });
      }

      const preview = await googleOAuth.getSpreadsheetPreview(accessToken, spreadsheetId, sheetName);
      res.json(preview);
    } catch (err) {
      handleRouteError(err, res, "POST /api/connectors/:id/google-sheets/preview");
    }
  });

  app.post("/api/connectors/:id/google-sheets/import", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.query.orgId as string) || 1;
      const userId = parseInt(req.query.userId as string) || 1;

      if (!checkRateLimit(`gsheets_import_${id}`, 10, 3600000)) {
        return res.status(429).json({ error: "Too many imports. Maximum 10 imports per hour per connector." });
      }

      const schema = z.object({
        spreadsheetId: z.string().min(1),
        sheetName: z.string().min(1),
        campaignId: z.number(),
        columnMapping: z.object({
          name: z.number().optional(),
          phone: z.number(),
          email: z.number().optional(),
          company: z.number().optional(),
        }),
        skipDuplicates: z.boolean().default(false),
      });
      const { spreadsheetId, sheetName, campaignId, columnMapping, skipDuplicates } = schema.parse(req.body);

      const connector = await storage.getConnector(id, orgId);
      if (!connector) return res.status(404).json({ error: "Connector not found" });
      if (connector.connectorType !== "google_sheets") {
        return res.status(400).json({ error: "Connector is not a Google Sheets connector" });
      }

      const accessToken = await getValidGoogleToken(connector);
      if (!accessToken) {
        return res.status(401).json({ error: "Unable to access Google Sheets. Please reconnect your account.", reconnectRequired: true });
      }

      const { headers, rows } = await googleOAuth.getSpreadsheetAllRows(accessToken, spreadsheetId, sheetName);

      let existingPhones = new Set<string>();
      if (skipDuplicates) {
        const existingContacts = await storage.getCampaignContacts(campaignId);
        existingPhones = new Set(existingContacts.map(c => c.phoneNumberE164 || c.phoneNumber).filter(Boolean));
      }

      const contacts: any[] = [];
      let duplicateCount = 0;
      let invalidCount = 0;

      for (const row of rows) {
        const phone = columnMapping.phone !== undefined ? (row[columnMapping.phone] || "").trim() : "";
        if (!phone) {
          invalidCount++;
          continue;
        }

        let normalizedPhone = phone;
        if (!phone.startsWith("+")) {
          normalizedPhone = phone.startsWith("0")
            ? `+44${phone.slice(1)}`
            : `+${phone}`;
        }
        normalizedPhone = normalizedPhone.replace(/[\s\-()]/g, "");

        if (skipDuplicates && existingPhones.has(normalizedPhone)) {
          duplicateCount++;
          continue;
        }

        const name = columnMapping.name !== undefined ? (row[columnMapping.name] || "").trim() : "";
        const email = columnMapping.email !== undefined ? (row[columnMapping.email] || "").trim() : "";
        const company = columnMapping.company !== undefined ? (row[columnMapping.company] || "").trim() : "";

        contacts.push({
          campaignId,
          contactName: name,
          phoneNumber: phone,
          phoneNumberE164: normalizedPhone,
          email: email || undefined,
          company: company || undefined,
          status: "pending",
          source: "google_sheets",
        });
      }

      let importedCount = 0;
      if (contacts.length > 0) {
        importedCount = await storage.bulkCreateCampaignContacts(contacts);
      }

      await storage.updateConnector(id, orgId, {
        totalLookups: (connector.totalLookups || 0) + importedCount,
      } as any);

      res.json({
        imported: importedCount,
        duplicates: duplicateCount,
        invalid: invalidCount,
        total: rows.length,
      });
    } catch (err) {
      handleRouteError(err, res, "POST /api/connectors/:id/google-sheets/import");
    }
  });

  // ============================================================
  // OAuth Routes — HubSpot
  // ============================================================

  app.get("/api/oauth/hubspot/authorize", async (req, res) => {
    try {
      const orgId = parseInt(req.query.orgId as string) || 1;
      const userId = parseInt(req.query.userId as string) || 1;
      const returnUrl = (req.query.returnUrl as string) || "/dashboard/data-sources";

      if (!process.env.HUBSPOT_CLIENT_ID || !process.env.HUBSPOT_CLIENT_SECRET) {
        return res.status(503).json({ error: "HubSpot OAuth is not configured. Please set HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET." });
      }

      const authUrl = hubspotOAuth.getAuthorizationUrl(orgId, userId, returnUrl);
      res.redirect(authUrl);
    } catch (err) {
      handleRouteError(err, res, "GET /api/oauth/hubspot/authorize");
    }
  });

  app.get("/api/oauth/hubspot/callback", async (req, res) => {
    const fallbackUrl = "/dashboard/data-sources";
    try {
      const { code, state: stateStr, error: oauthError } = req.query;

      if (oauthError) {
        return res.redirect(`${fallbackUrl}?error=connection_failed`);
      }

      if (!stateStr || !code) {
        return res.redirect(`${fallbackUrl}?error=invalid_state`);
      }

      const state = hubspotOAuth.validateState(stateStr as string);
      if (!state) {
        return res.redirect(`${fallbackUrl}?error=invalid_state`);
      }

      const returnUrl = state.returnUrl || fallbackUrl;

      let tokens: hubspotOAuth.HubSpotTokens;
      try {
        tokens = await hubspotOAuth.exchangeCodeForTokens(code as string);
      } catch {
        return res.redirect(`${returnUrl}?error=connection_failed`);
      }

      await storage.createConnector({
        orgId: state.orgId,
        userId: state.userId,
        connectorType: "hubspot",
        name: tokens.userEmail ? `HubSpot (${tokens.userEmail})` : "HubSpot",
        authType: "oauth",
        oauthAccessToken: tokens.accessToken,
        oauthRefreshToken: tokens.refreshToken,
        oauthExpiresAt: tokens.expiresAt,
        oauthScopes: "crm.objects.contacts.read",
        oauthEmail: tokens.userEmail,
        config: { hubId: tokens.hubId },
        status: "active",
      });

      res.redirect(`${returnUrl}?connected=hubspot`);
    } catch (err) {
      console.error("HubSpot OAuth callback error:", err instanceof Error ? err.message : err);
      res.redirect(`${fallbackUrl}?error=connection_failed`);
    }
  });

  async function getValidHubSpotToken(connector: any): Promise<string | null> {
    if (!connector.oauthAccessToken) return null;

    const decryptedAccess = decrypt(connector.oauthAccessToken);
    if (!decryptedAccess) return null;

    if (!hubspotOAuth.isTokenExpiringSoon(connector.oauthExpiresAt)) {
      return decryptedAccess;
    }

    if (!connector.oauthRefreshToken) return null;
    const decryptedRefresh = decrypt(connector.oauthRefreshToken);
    if (!decryptedRefresh) return null;

    try {
      const refreshed = await hubspotOAuth.refreshAccessToken(decryptedRefresh);
      await storage.updateConnectorTokens(connector.id, connector.orgId, {
        oauthAccessToken: refreshed.accessToken,
        oauthRefreshToken: refreshed.refreshToken,
        oauthExpiresAt: refreshed.expiresAt,
      });
      return refreshed.accessToken;
    } catch (err) {
      if (err instanceof Error && err.message === "REVOKED") {
        await storage.updateConnector(connector.id, connector.orgId, {
          status: "disconnected",
          lastErrorMessage: "You've disconnected GoRigo from your HubSpot account. Reconnect to continue.",
        } as any);
      }
      return null;
    }
  }

  app.post("/api/connectors/:id/hubspot/contacts", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.query.orgId as string) || 1;

      const connector = await storage.getConnector(id, orgId);
      if (!connector) return res.status(404).json({ error: "Connector not found" });
      if (connector.connectorType !== "hubspot") {
        return res.status(400).json({ error: "Connector is not a HubSpot connector" });
      }

      const accessToken = await getValidHubSpotToken(connector);
      if (!accessToken) {
        return res.status(401).json({ error: "Unable to access HubSpot. Please reconnect your account.", reconnectRequired: true });
      }

      const { search, after, limit } = req.body || {};
      const result = await hubspotOAuth.listContacts(accessToken, {
        search: search as string | undefined,
        after: after as string | undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      let truncated = false;
      if (result.total > 1000 && !search) {
        truncated = true;
      }

      res.json({
        ...result,
        truncated,
        message: truncated ? "Showing first 1000. Use search to find specific contacts." : undefined,
      });
    } catch (err) {
      handleRouteError(err, res, "POST /api/connectors/:id/hubspot/contacts");
    }
  });

  app.post("/api/connectors/:id/hubspot/import", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.query.orgId as string) || 1;

      if (!checkRateLimit(`hubspot_import_${id}`, 10, 3600000)) {
        return res.status(429).json({ error: "Too many imports. Maximum 10 imports per hour per connector." });
      }

      const schema = z.object({
        campaignId: z.number(),
        contactIds: z.array(z.string()).min(1),
        skipDuplicates: z.boolean().default(false),
      });
      const { campaignId, contactIds, skipDuplicates } = schema.parse(req.body);

      const connector = await storage.getConnector(id, orgId);
      if (!connector) return res.status(404).json({ error: "Connector not found" });
      if (connector.connectorType !== "hubspot") {
        return res.status(400).json({ error: "Connector is not a HubSpot connector" });
      }

      const accessToken = await getValidHubSpotToken(connector);
      if (!accessToken) {
        return res.status(401).json({ error: "Unable to access HubSpot. Please reconnect your account.", reconnectRequired: true });
      }

      const allContacts = await hubspotOAuth.listContacts(accessToken, { limit: 100 });
      const contactMap = new Map(allContacts.contacts.map(c => [c.id, c]));

      let existingPhones = new Set<string>();
      if (skipDuplicates) {
        const existingContacts = await storage.getCampaignContacts(campaignId);
        existingPhones = new Set(existingContacts.map(c => c.phoneNumberE164 || c.phoneNumber).filter(Boolean));
      }

      const contacts: any[] = [];
      let duplicateCount = 0;
      let invalidCount = 0;

      for (const cid of contactIds) {
        const hubContact = contactMap.get(cid);
        if (!hubContact || !hubContact.phone) {
          invalidCount++;
          continue;
        }

        let normalizedPhone = hubContact.phone.trim();
        if (!normalizedPhone.startsWith("+")) {
          normalizedPhone = normalizedPhone.startsWith("0")
            ? `+44${normalizedPhone.slice(1)}`
            : `+${normalizedPhone}`;
        }
        normalizedPhone = normalizedPhone.replace(/[\s\-()]/g, "");

        if (skipDuplicates && existingPhones.has(normalizedPhone)) {
          duplicateCount++;
          continue;
        }

        const name = [hubContact.firstName, hubContact.lastName].filter(Boolean).join(" ");

        contacts.push({
          campaignId,
          contactName: name,
          phoneNumber: hubContact.phone,
          phoneNumberE164: normalizedPhone,
          email: hubContact.email || undefined,
          company: hubContact.company || undefined,
          status: "pending",
          source: "hubspot",
        });
      }

      let importedCount = 0;
      if (contacts.length > 0) {
        importedCount = await storage.bulkCreateCampaignContacts(contacts);
      }

      await storage.updateConnector(id, orgId, {
        totalLookups: (connector.totalLookups || 0) + importedCount,
      } as any);

      res.json({
        imported: importedCount,
        duplicates: duplicateCount,
        invalid: invalidCount,
        total: contactIds.length,
      });
    } catch (err) {
      handleRouteError(err, res, "POST /api/connectors/:id/hubspot/import");
    }
  });

  // ============================================================
  // OAuth Token Revocation on Connector Delete
  // ============================================================

  app.delete("/api/connectors/:id/oauth", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.query.orgId as string) || 1;

      const connector = await storage.getConnector(id, orgId);
      if (!connector) return res.status(404).json({ error: "Connector not found" });

      if (connector.oauthAccessToken) {
        const decryptedToken = decrypt(connector.oauthAccessToken);
        if (decryptedToken) {
          if (connector.connectorType === "google_sheets") {
            await googleOAuth.revokeToken(decryptedToken);
          }
        }
      }
      if (connector.oauthRefreshToken && connector.connectorType === "hubspot") {
        const decryptedRefresh = decrypt(connector.oauthRefreshToken);
        if (decryptedRefresh) {
          await hubspotOAuth.revokeToken(decryptedRefresh);
        }
      }

      await storage.softDeleteConnector(id, orgId);
      res.json({ message: "Connector disconnected and tokens revoked" });
    } catch (err) {
      handleRouteError(err, res, "DELETE /api/connectors/:id/oauth");
    }
  });

  return httpServer;
}
