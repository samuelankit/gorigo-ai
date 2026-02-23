import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { handleRouteError } from "./error-handler";
import {
  insertCountrySchema,
  insertCountryComplianceProfileSchema,
  insertCountryRateCardSchema,
  insertCountryHolidaySchema,
  insertCampaignSchema,
  insertCampaignContactSchema,
} from "@shared/schema";

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

  return httpServer;
}
