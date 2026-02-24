import { db } from "../lib/db";
import { countries, countryComplianceProfiles, countryRateCards } from "../shared/schema";

const COUNTRIES_DATA = [
  { isoCode: "GB", name: "United Kingdom", callingCode: "+44", timezone: "Europe/London", currency: "GBP", tier: 1, status: "active", region: "Europe", requiresKyc: false, requiresLocalPresence: false, sanctioned: false },
  { isoCode: "US", name: "United States", callingCode: "+1", timezone: "America/New_York", currency: "USD", tier: 1, status: "active", region: "North America", requiresKyc: false, requiresLocalPresence: false, sanctioned: false },
  { isoCode: "FR", name: "France", callingCode: "+33", timezone: "Europe/Paris", currency: "EUR", tier: 1, status: "active", region: "Europe", requiresKyc: true, requiresLocalPresence: true, sanctioned: false },
  { isoCode: "DE", name: "Germany", callingCode: "+49", timezone: "Europe/Berlin", currency: "EUR", tier: 1, status: "active", region: "Europe", requiresKyc: true, requiresLocalPresence: true, sanctioned: false },
  { isoCode: "IN", name: "India", callingCode: "+91", timezone: "Asia/Kolkata", currency: "INR", tier: 1, status: "active", region: "Asia", requiresKyc: true, requiresLocalPresence: false, sanctioned: false },
  { isoCode: "CA", name: "Canada", callingCode: "+1", timezone: "America/Toronto", currency: "CAD", tier: 1, status: "active", region: "North America", requiresKyc: false, requiresLocalPresence: false, sanctioned: false },
  { isoCode: "AU", name: "Australia", callingCode: "+61", timezone: "Australia/Sydney", currency: "AUD", tier: 1, status: "active", region: "Oceania", requiresKyc: true, requiresLocalPresence: false, sanctioned: false },
  { isoCode: "ES", name: "Spain", callingCode: "+34", timezone: "Europe/Madrid", currency: "EUR", tier: 2, status: "active", region: "Europe", requiresKyc: true, requiresLocalPresence: true, sanctioned: false },
  { isoCode: "IT", name: "Italy", callingCode: "+39", timezone: "Europe/Rome", currency: "EUR", tier: 2, status: "active", region: "Europe", requiresKyc: true, requiresLocalPresence: true, sanctioned: false },
  { isoCode: "NL", name: "Netherlands", callingCode: "+31", timezone: "Europe/Amsterdam", currency: "EUR", tier: 2, status: "active", region: "Europe", requiresKyc: true, requiresLocalPresence: true, sanctioned: false },
  { isoCode: "JP", name: "Japan", callingCode: "+81", timezone: "Asia/Tokyo", currency: "JPY", tier: 2, status: "active", region: "Asia", requiresKyc: true, requiresLocalPresence: true, sanctioned: false },
  { isoCode: "BR", name: "Brazil", callingCode: "+55", timezone: "America/Sao_Paulo", currency: "BRL", tier: 2, status: "active", region: "South America", requiresKyc: true, requiresLocalPresence: false, sanctioned: false },
  { isoCode: "MX", name: "Mexico", callingCode: "+52", timezone: "America/Mexico_City", currency: "MXN", tier: 2, status: "active", region: "North America", requiresKyc: false, requiresLocalPresence: false, sanctioned: false },
  { isoCode: "AE", name: "United Arab Emirates", callingCode: "+971", timezone: "Asia/Dubai", currency: "AED", tier: 2, status: "active", region: "Middle East", requiresKyc: true, requiresLocalPresence: true, sanctioned: false },
  { isoCode: "SG", name: "Singapore", callingCode: "+65", timezone: "Asia/Singapore", currency: "SGD", tier: 2, status: "active", region: "Asia", requiresKyc: false, requiresLocalPresence: false, sanctioned: false },
  { isoCode: "ZA", name: "South Africa", callingCode: "+27", timezone: "Africa/Johannesburg", currency: "ZAR", tier: 2, status: "active", region: "Africa", requiresKyc: false, requiresLocalPresence: false, sanctioned: false },
  { isoCode: "IE", name: "Ireland", callingCode: "+353", timezone: "Europe/Dublin", currency: "EUR", tier: 2, status: "active", region: "Europe", requiresKyc: true, requiresLocalPresence: true, sanctioned: false },
  { isoCode: "SE", name: "Sweden", callingCode: "+46", timezone: "Europe/Stockholm", currency: "SEK", tier: 2, status: "active", region: "Europe", requiresKyc: true, requiresLocalPresence: true, sanctioned: false },
  { isoCode: "CH", name: "Switzerland", callingCode: "+41", timezone: "Europe/Zurich", currency: "CHF", tier: 2, status: "active", region: "Europe", requiresKyc: true, requiresLocalPresence: true, sanctioned: false },
  { isoCode: "PL", name: "Poland", callingCode: "+48", timezone: "Europe/Warsaw", currency: "PLN", tier: 2, status: "active", region: "Europe", requiresKyc: true, requiresLocalPresence: true, sanctioned: false },
];

const COMPLIANCE_PROFILES: Record<string, Partial<typeof countryComplianceProfiles.$inferInsert>> = {
  GB: {
    callingHoursStart: "08:00", callingHoursEnd: "21:00", callingHoursTimezone: "Europe/London",
    restrictedDays: ["sunday"],
    dncRegistryName: "TPS (Telephone Preference Service)", dncRegistryUrl: "https://www.tpsonline.org.uk", dncCheckMethod: "api",
    aiDisclosureRequired: true, aiDisclosureScript: "This call is powered by artificial intelligence on behalf of {business_name}.", aiDisclosureLanguage: "en-GB",
    recordingConsentType: "one_party",
    maxCallAttemptsPerDay: 3, maxCallAttemptsPerWeek: 10, coolingOffHours: 24,
    dataRetentionDays: 90, dataResidencyRequired: false,
    regulatoryBody: "ICO / Ofcom", regulatoryUrl: "https://www.ofcom.org.uk",
  },
  US: {
    callingHoursStart: "08:00", callingHoursEnd: "21:00", callingHoursTimezone: "America/New_York",
    restrictedDays: [],
    dncRegistryName: "National Do Not Call Registry", dncRegistryUrl: "https://www.donotcall.gov", dncCheckMethod: "api",
    aiDisclosureRequired: true, aiDisclosureScript: "This is an automated call using artificial intelligence on behalf of {business_name}.", aiDisclosureLanguage: "en-US",
    recordingConsentType: "one_party",
    maxCallAttemptsPerDay: 3, maxCallAttemptsPerWeek: 10, coolingOffHours: 24,
    dataRetentionDays: 180, dataResidencyRequired: false,
    regulatoryBody: "FCC / FTC", regulatoryUrl: "https://www.fcc.gov",
  },
  FR: {
    callingHoursStart: "08:00", callingHoursEnd: "20:00", callingHoursTimezone: "Europe/Paris",
    restrictedDays: ["sunday", "public_holidays"],
    dncRegistryName: "Bloctel", dncRegistryUrl: "https://www.bloctel.gouv.fr", dncCheckMethod: "api",
    aiDisclosureRequired: true, aiDisclosureScript: "Cet appel utilise l'intelligence artificielle pour le compte de {business_name}.", aiDisclosureLanguage: "fr-FR",
    recordingConsentType: "two_party", recordingConsentScript: "Cet appel peut etre enregistre a des fins de qualite. Acceptez-vous l'enregistrement?",
    maxCallAttemptsPerDay: 2, maxCallAttemptsPerWeek: 6, coolingOffHours: 48,
    dataRetentionDays: 90, dataResidencyRequired: true, dataResidencyRegion: "EU",
    regulatoryBody: "CNIL / ARCEP", regulatoryUrl: "https://www.cnil.fr",
  },
  DE: {
    callingHoursStart: "08:00", callingHoursEnd: "20:00", callingHoursTimezone: "Europe/Berlin",
    restrictedDays: ["sunday", "public_holidays"],
    dncRegistryName: "Robinson List", dncRegistryUrl: "https://www.robinsonliste.de", dncCheckMethod: "manual",
    aiDisclosureRequired: true, aiDisclosureScript: "Dieser Anruf wird von kunstlicher Intelligenz im Auftrag von {business_name} durchgefuhrt.", aiDisclosureLanguage: "de-DE",
    recordingConsentType: "two_party", recordingConsentScript: "Dieser Anruf kann zu Qualitatszwecken aufgezeichnet werden. Stimmen Sie der Aufzeichnung zu?",
    maxCallAttemptsPerDay: 2, maxCallAttemptsPerWeek: 6, coolingOffHours: 48,
    dataRetentionDays: 90, dataResidencyRequired: true, dataResidencyRegion: "EU",
    regulatoryBody: "BNetzA / BfDI", regulatoryUrl: "https://www.bundesnetzagentur.de",
  },
  IN: {
    callingHoursStart: "09:00", callingHoursEnd: "21:00", callingHoursTimezone: "Asia/Kolkata",
    restrictedDays: ["national_holidays"],
    dncRegistryName: "NDNC (National Do Not Call Registry)", dncRegistryUrl: "https://www.nccptrai.gov.in", dncCheckMethod: "file_import",
    aiDisclosureRequired: true, aiDisclosureScript: "Yah call {business_name} ki taraf se artificial intelligence dwara ki ja rahi hai.", aiDisclosureLanguage: "hi-IN",
    recordingConsentType: "one_party",
    maxCallAttemptsPerDay: 3, maxCallAttemptsPerWeek: 7, coolingOffHours: 24,
    dataRetentionDays: 180, dataResidencyRequired: true, dataResidencyRegion: "IN",
    regulatoryBody: "TRAI", regulatoryUrl: "https://www.trai.gov.in",
  },
  CA: {
    callingHoursStart: "08:00", callingHoursEnd: "21:00", callingHoursTimezone: "America/Toronto",
    restrictedDays: [],
    dncRegistryName: "National DNCL", dncRegistryUrl: "https://lnnte-dncl.gc.ca", dncCheckMethod: "api",
    aiDisclosureRequired: true, aiDisclosureScript: "This is an automated call using artificial intelligence on behalf of {business_name}.", aiDisclosureLanguage: "en-CA",
    recordingConsentType: "one_party",
    maxCallAttemptsPerDay: 3, maxCallAttemptsPerWeek: 10, coolingOffHours: 24,
    dataRetentionDays: 180, dataResidencyRequired: false,
    regulatoryBody: "CRTC", regulatoryUrl: "https://crtc.gc.ca",
  },
  AU: {
    callingHoursStart: "09:00", callingHoursEnd: "20:00", callingHoursTimezone: "Australia/Sydney",
    restrictedDays: ["sunday", "public_holidays"],
    dncRegistryName: "Do Not Call Register", dncRegistryUrl: "https://www.donotcall.gov.au", dncCheckMethod: "api",
    aiDisclosureRequired: true, aiDisclosureScript: "This call uses artificial intelligence on behalf of {business_name}.", aiDisclosureLanguage: "en-AU",
    recordingConsentType: "one_party",
    maxCallAttemptsPerDay: 3, maxCallAttemptsPerWeek: 9, coolingOffHours: 24,
    dataRetentionDays: 90, dataResidencyRequired: false,
    regulatoryBody: "ACMA", regulatoryUrl: "https://www.acma.gov.au",
  },
  ES: {
    callingHoursStart: "09:00", callingHoursEnd: "21:00", callingHoursTimezone: "Europe/Madrid",
    restrictedDays: ["sunday", "public_holidays"],
    dncRegistryName: "Lista Robinson", dncRegistryUrl: "https://www.listarobinson.es", dncCheckMethod: "api",
    aiDisclosureRequired: true, aiDisclosureScript: "Esta llamada utiliza inteligencia artificial en nombre de {business_name}.", aiDisclosureLanguage: "es-ES",
    recordingConsentType: "two_party",
    maxCallAttemptsPerDay: 2, maxCallAttemptsPerWeek: 6, coolingOffHours: 48,
    dataRetentionDays: 90, dataResidencyRequired: true, dataResidencyRegion: "EU",
    regulatoryBody: "AEPD / CNMC", regulatoryUrl: "https://www.aepd.es",
  },
  IT: {
    callingHoursStart: "09:00", callingHoursEnd: "21:00", callingHoursTimezone: "Europe/Rome",
    restrictedDays: ["sunday", "public_holidays"],
    dncRegistryName: "Registro Pubblico delle Opposizioni", dncRegistryUrl: "https://www.registrodelleopposizioni.it", dncCheckMethod: "api",
    aiDisclosureRequired: true, aiDisclosureScript: "Questa chiamata utilizza l'intelligenza artificiale per conto di {business_name}.", aiDisclosureLanguage: "it-IT",
    recordingConsentType: "two_party",
    maxCallAttemptsPerDay: 2, maxCallAttemptsPerWeek: 6, coolingOffHours: 48,
    dataRetentionDays: 90, dataResidencyRequired: true, dataResidencyRegion: "EU",
    regulatoryBody: "Garante Privacy / AGCOM", regulatoryUrl: "https://www.garanteprivacy.it",
  },
  NL: {
    callingHoursStart: "08:00", callingHoursEnd: "21:00", callingHoursTimezone: "Europe/Amsterdam",
    restrictedDays: ["sunday"],
    dncRegistryName: "Bel-me-niet Register", dncRegistryUrl: "https://www.bfreg.nl", dncCheckMethod: "api",
    aiDisclosureRequired: true, aiDisclosureScript: "Dit gesprek maakt gebruik van kunstmatige intelligentie namens {business_name}.", aiDisclosureLanguage: "nl-NL",
    recordingConsentType: "two_party",
    maxCallAttemptsPerDay: 2, maxCallAttemptsPerWeek: 6, coolingOffHours: 48,
    dataRetentionDays: 90, dataResidencyRequired: true, dataResidencyRegion: "EU",
    regulatoryBody: "Autoriteit Persoonsgegevens", regulatoryUrl: "https://www.autoriteitpersoonsgegevens.nl",
  },
  JP: {
    callingHoursStart: "09:00", callingHoursEnd: "20:00", callingHoursTimezone: "Asia/Tokyo",
    restrictedDays: ["national_holidays"],
    dncRegistryName: "TCA Do Not Call", dncCheckMethod: "manual",
    aiDisclosureRequired: true, aiDisclosureScript: "このお電話は{business_name}の代わりに人工知能によって行われています。", aiDisclosureLanguage: "ja-JP",
    recordingConsentType: "one_party",
    maxCallAttemptsPerDay: 2, maxCallAttemptsPerWeek: 5, coolingOffHours: 48,
    dataRetentionDays: 90, dataResidencyRequired: true, dataResidencyRegion: "JP",
    regulatoryBody: "PPC / MIC", regulatoryUrl: "https://www.ppc.go.jp",
  },
  BR: {
    callingHoursStart: "09:00", callingHoursEnd: "21:00", callingHoursTimezone: "America/Sao_Paulo",
    restrictedDays: ["sunday", "public_holidays"],
    dncRegistryName: "Procon / Nao Me Perturbe", dncRegistryUrl: "https://www.naomeperturbe.com.br", dncCheckMethod: "api",
    aiDisclosureRequired: true, aiDisclosureScript: "Esta ligacao utiliza inteligencia artificial em nome de {business_name}.", aiDisclosureLanguage: "pt-BR",
    recordingConsentType: "one_party",
    maxCallAttemptsPerDay: 3, maxCallAttemptsPerWeek: 9, coolingOffHours: 24,
    dataRetentionDays: 180, dataResidencyRequired: true, dataResidencyRegion: "BR",
    regulatoryBody: "ANATEL / LGPD", regulatoryUrl: "https://www.anatel.gov.br",
  },
  MX: {
    callingHoursStart: "08:00", callingHoursEnd: "21:00", callingHoursTimezone: "America/Mexico_City",
    restrictedDays: [],
    dncRegistryName: "REPEP", dncRegistryUrl: "https://repep.profeco.gob.mx", dncCheckMethod: "manual",
    aiDisclosureRequired: true, aiDisclosureScript: "Esta llamada utiliza inteligencia artificial en nombre de {business_name}.", aiDisclosureLanguage: "es-MX",
    recordingConsentType: "one_party",
    maxCallAttemptsPerDay: 3, maxCallAttemptsPerWeek: 9, coolingOffHours: 24,
    dataRetentionDays: 180, dataResidencyRequired: false,
    regulatoryBody: "PROFECO / IFT", regulatoryUrl: "https://www.ift.org.mx",
  },
  AE: {
    callingHoursStart: "09:00", callingHoursEnd: "21:00", callingHoursTimezone: "Asia/Dubai",
    restrictedDays: ["friday"],
    dncRegistryName: "TRA DNC", dncCheckMethod: "manual",
    aiDisclosureRequired: true, aiDisclosureScript: "This call uses artificial intelligence on behalf of {business_name}.", aiDisclosureLanguage: "en-AE",
    recordingConsentType: "one_party",
    maxCallAttemptsPerDay: 2, maxCallAttemptsPerWeek: 6, coolingOffHours: 48,
    dataRetentionDays: 180, dataResidencyRequired: true, dataResidencyRegion: "AE",
    regulatoryBody: "TRA / TDRA", regulatoryUrl: "https://www.tdra.gov.ae",
  },
  SG: {
    callingHoursStart: "09:00", callingHoursEnd: "21:00", callingHoursTimezone: "Asia/Singapore",
    restrictedDays: [],
    dncRegistryName: "DNC Registry Singapore", dncRegistryUrl: "https://www.dnc.gov.sg", dncCheckMethod: "api",
    aiDisclosureRequired: true, aiDisclosureScript: "This call uses artificial intelligence on behalf of {business_name}.", aiDisclosureLanguage: "en-SG",
    recordingConsentType: "one_party",
    maxCallAttemptsPerDay: 3, maxCallAttemptsPerWeek: 9, coolingOffHours: 24,
    dataRetentionDays: 90, dataResidencyRequired: false,
    regulatoryBody: "PDPC / IMDA", regulatoryUrl: "https://www.pdpc.gov.sg",
  },
  ZA: {
    callingHoursStart: "08:00", callingHoursEnd: "20:00", callingHoursTimezone: "Africa/Johannesburg",
    restrictedDays: ["sunday", "public_holidays"],
    dncRegistryName: "National Opt-Out Registry", dncCheckMethod: "manual",
    aiDisclosureRequired: true, aiDisclosureScript: "This call uses artificial intelligence on behalf of {business_name}.", aiDisclosureLanguage: "en-ZA",
    recordingConsentType: "one_party",
    maxCallAttemptsPerDay: 3, maxCallAttemptsPerWeek: 9, coolingOffHours: 24,
    dataRetentionDays: 180, dataResidencyRequired: false,
    regulatoryBody: "ICASA / Information Regulator", regulatoryUrl: "https://www.icasa.org.za",
  },
  IE: {
    callingHoursStart: "09:00", callingHoursEnd: "21:00", callingHoursTimezone: "Europe/Dublin",
    restrictedDays: ["sunday"],
    dncRegistryName: "National Directory Database", dncCheckMethod: "manual",
    aiDisclosureRequired: true, aiDisclosureScript: "This call uses artificial intelligence on behalf of {business_name}.", aiDisclosureLanguage: "en-IE",
    recordingConsentType: "two_party",
    maxCallAttemptsPerDay: 2, maxCallAttemptsPerWeek: 6, coolingOffHours: 48,
    dataRetentionDays: 90, dataResidencyRequired: true, dataResidencyRegion: "EU",
    regulatoryBody: "DPC / ComReg", regulatoryUrl: "https://www.dataprotection.ie",
  },
  SE: {
    callingHoursStart: "08:00", callingHoursEnd: "20:00", callingHoursTimezone: "Europe/Stockholm",
    restrictedDays: ["sunday"],
    dncRegistryName: "NIX-Telefon", dncRegistryUrl: "https://www.nixtelefon.org", dncCheckMethod: "api",
    aiDisclosureRequired: true, aiDisclosureScript: "Detta samtal anvander artificiell intelligens pa uppdrag av {business_name}.", aiDisclosureLanguage: "sv-SE",
    recordingConsentType: "two_party",
    maxCallAttemptsPerDay: 2, maxCallAttemptsPerWeek: 6, coolingOffHours: 48,
    dataRetentionDays: 90, dataResidencyRequired: true, dataResidencyRegion: "EU",
    regulatoryBody: "IMY / PTS", regulatoryUrl: "https://www.imy.se",
  },
  CH: {
    callingHoursStart: "08:00", callingHoursEnd: "20:00", callingHoursTimezone: "Europe/Zurich",
    restrictedDays: ["sunday", "public_holidays"],
    dncRegistryName: "Sterne Register", dncCheckMethod: "manual",
    aiDisclosureRequired: true, aiDisclosureScript: "Dieser Anruf verwendet kunstliche Intelligenz im Auftrag von {business_name}.", aiDisclosureLanguage: "de-CH",
    recordingConsentType: "two_party",
    maxCallAttemptsPerDay: 2, maxCallAttemptsPerWeek: 6, coolingOffHours: 48,
    dataRetentionDays: 90, dataResidencyRequired: false,
    regulatoryBody: "FDPIC / OFCOM", regulatoryUrl: "https://www.edoeb.admin.ch",
  },
  PL: {
    callingHoursStart: "08:00", callingHoursEnd: "20:00", callingHoursTimezone: "Europe/Warsaw",
    restrictedDays: ["sunday", "public_holidays"],
    dncRegistryName: "GIODO DNC", dncCheckMethod: "manual",
    aiDisclosureRequired: true, aiDisclosureScript: "To polaczenie wykorzystuje sztuczna inteligencje w imieniu {business_name}.", aiDisclosureLanguage: "pl-PL",
    recordingConsentType: "two_party",
    maxCallAttemptsPerDay: 2, maxCallAttemptsPerWeek: 6, coolingOffHours: 48,
    dataRetentionDays: 90, dataResidencyRequired: true, dataResidencyRegion: "EU",
    regulatoryBody: "UODO / UKE", regulatoryUrl: "https://www.uodo.gov.pl",
  },
};

const DEPLOYMENT_MODELS = ["individual", "self_hosted", "custom"];
const DIRECTIONS = ["inbound", "outbound"] as const;
const NUMBER_TYPES = ["mobile", "landline"] as const;

const BASE_SURCHARGES: Record<number, Record<string, number>> = {
  1: {
    "outbound_mobile": 0.02, "outbound_landline": 0.01,
    "inbound_mobile": 0.01, "inbound_landline": 0.005,
  },
  2: {
    "outbound_mobile": 0.04, "outbound_landline": 0.025,
    "inbound_mobile": 0.02, "inbound_landline": 0.01,
  },
};

async function seed() {
  console.log("Seeding countries...");

  for (const countryData of COUNTRIES_DATA) {
    const [inserted] = await db.insert(countries).values(countryData).onConflictDoNothing().returning();
    if (!inserted) {
      console.log(`  Skipped ${countryData.isoCode} (already exists)`);
      continue;
    }
    console.log(`  Inserted country: ${countryData.name} (${countryData.isoCode})`);

    const complianceData = COMPLIANCE_PROFILES[countryData.isoCode];
    if (complianceData) {
      await db.insert(countryComplianceProfiles).values({
        countryId: inserted.id,
        ...complianceData,
        callingHoursTimezone: complianceData.callingHoursTimezone || countryData.timezone,
      } as any).onConflictDoNothing();
      console.log(`    Compliance profile created`);
    }

    const tierRates = BASE_SURCHARGES[countryData.tier] || BASE_SURCHARGES[2];
    for (const model of DEPLOYMENT_MODELS) {
      for (const direction of DIRECTIONS) {
        for (const numberType of NUMBER_TYPES) {
          const key = `${direction}_${numberType}`;
          const surcharge: number = tierRates[key] ?? 0.03;
          const modelMultiplier: number = model === "individual" ? 1 : model === "custom" ? 1 : 0.5;
          const finalRate = Math.round(surcharge * modelMultiplier * 10000) / 10000;
          const twilioCost = Math.round(surcharge * 0.6 * 10000) / 10000;
          await db.insert(countryRateCards).values({
            countryId: inserted.id,
            deploymentModel: model,
            direction,
            numberType,
            surchargePerMinute: String(finalRate),
            twilioEstimatedCost: String(twilioCost),
            marginPercent: "20",
            isActive: true,
          }).onConflictDoNothing();
        }
      }
    }
    console.log(`    Rate cards created (${DEPLOYMENT_MODELS.length * DIRECTIONS.length * NUMBER_TYPES.length} entries)`);
  }

  console.log("\nSeeding complete!");
}

seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
