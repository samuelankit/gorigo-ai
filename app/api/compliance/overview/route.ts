import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countries, countryComplianceProfiles, countryHolidays, doNotCallList, callLogs } from "@/shared/schema";
import { eq, and, count, gte } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";

export async function GET(_request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allCountries = await db
      .select()
      .from(countries)
      .where(eq(countries.status, "active"))
      .orderBy(countries.name);

    const complianceProfiles = await db
      .select()
      .from(countryComplianceProfiles);

    const profileMap = new Map(complianceProfiles.map((p) => [p.countryId, p]));

    const holidays = await db
      .select()
      .from(countryHolidays)
      .orderBy(countryHolidays.date);

    const holidaysByCountry = new Map<number, typeof holidays>();
    for (const h of holidays) {
      if (!holidaysByCountry.has(h.countryId)) {
        holidaysByCountry.set(h.countryId, []);
      }
      holidaysByCountry.get(h.countryId)!.push(h);
    }

    const [dncCount] = await db
      .select({ count: count() })
      .from(doNotCallList)
      .where(eq(doNotCallList.orgId, auth.orgId));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCallStats = await db
      .select({
        countryCode: callLogs.destinationCountry,
        totalCalls: count(),
      })
      .from(callLogs)
      .where(and(eq(callLogs.orgId, auth.orgId), gte(callLogs.startedAt, thirtyDaysAgo)))
      .groupBy(callLogs.destinationCountry);

    const callsByCountry = new Map(recentCallStats.map((s) => [s.countryCode, s.totalCalls]));

    const countryOverviews = allCountries.map((country) => {
      const profile = profileMap.get(country.id);
      const countryHols = holidaysByCountry.get(country.id) || [];
      const callCount = callsByCountry.get(country.isoCode) || 0;

      const now = new Date();
      let withinCallingHours = true;
      let currentLocalTime = "";
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: country.timezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const parts = formatter.formatToParts(now);
        const hour = parts.find((p) => p.type === "hour")?.value || "00";
        const minute = parts.find((p) => p.type === "minute")?.value || "00";
        currentLocalTime = `${hour}:${minute}`;

        if (profile) {
          const start = profile.callingHoursStart || "09:00";
          const end = profile.callingHoursEnd || "20:00";
          withinCallingHours = currentLocalTime >= start && currentLocalTime < end;

          const dayFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: country.timezone,
            weekday: "long",
          });
          const weekday = dayFormatter.format(now).toLowerCase();
          const restricted = (profile.restrictedDays as string[]) || [];
          if (restricted.includes(weekday)) {
            withinCallingHours = false;
          }
        }
      } catch {}

      let complianceScore = 100;
      const issues: string[] = [];

      if (!profile) {
        complianceScore = 0;
        issues.push("No compliance profile configured");
      } else {
        if (!profile.aiDisclosureRequired) {
          complianceScore -= 15;
          issues.push("AI disclosure not required");
        }
        if (!profile.recordingConsentType) {
          complianceScore -= 15;
          issues.push("Recording consent mode not set");
        }
        if (!profile.dncRegistryName) {
          complianceScore -= 10;
          issues.push("No DNC registry configured");
        }
      }

      return {
        id: country.id,
        isoCode: country.isoCode,
        name: country.name,
        callingCode: country.callingCode,
        timezone: country.timezone,
        region: country.region,
        currentLocalTime,
        withinCallingHours,
        callCount,
        complianceScore,
        issues,
        callingHours: profile
          ? {
              start: profile.callingHoursStart,
              end: profile.callingHoursEnd,
              timezone: profile.callingHoursTimezone || country.timezone,
              restrictedDays: (profile.restrictedDays as string[]) || [],
            }
          : null,
        dnc: profile
          ? {
              registryName: profile.dncRegistryName,
              registryUrl: profile.dncRegistryUrl,
              checkMethod: profile.dncCheckMethod,
            }
          : null,
        disclosure: profile
          ? {
              required: profile.aiDisclosureRequired,
              language: profile.aiDisclosureLanguage,
              customScript: profile.aiDisclosureScript,
            }
          : null,
        consent: profile
          ? {
              type: profile.recordingConsentType,
              script: profile.recordingConsentScript,
            }
          : null,
        holidays: countryHols.map((h) => ({
          name: h.name,
          date: h.date,
          noCallingAllowed: h.noCallingAllowed,
          isRecurring: h.isRecurring,
        })),
      };
    });

    const disclosureTexts: Record<string, string> = {
      en: "Please be advised that this call uses artificial intelligence technology and may be recorded for quality assurance.",
      fr: "Veuillez noter que cet appel utilise l'intelligence artificielle et peut \u00eatre enregistr\u00e9 pour l'assurance qualit\u00e9.",
      de: "Bitte beachten Sie, dass dieses Gespr\u00e4ch k\u00fcnstliche Intelligenz nutzt und zur Qualit\u00e4tssicherung aufgezeichnet werden kann.",
      es: "Por favor, tenga en cuenta que esta llamada utiliza inteligencia artificial y puede ser grabada para garant\u00eda de calidad.",
      it: "Si prega di notare che questa chiamata utilizza l'intelligenza artificiale e potrebbe essere registrata per la garanzia della qualit\u00e0.",
      pt: "Por favor, esteja ciente de que esta chamada usa intelig\u00eancia artificial e pode ser gravada para garantia de qualidade.",
      nl: "Houd er rekening mee dat dit gesprek gebruik maakt van kunstmatige intelligentie en kan worden opgenomen voor kwaliteitsborging.",
      ja: "\u3053\u306e\u30b3\u30fc\u30eb\u306f\u4eba\u5de5\u77e5\u80fd\u6280\u8853\u3092\u4f7f\u7528\u3057\u3066\u304a\u308a\u3001\u54c1\u8cea\u4fdd\u8a3c\u306e\u305f\u3081\u306b\u9332\u97f3\u3055\u308c\u308b\u5834\u5408\u304c\u3042\u308a\u307e\u3059\u3002",
      ar: "\u064a\u0631\u062c\u0649 \u0627\u0644\u0639\u0644\u0645 \u0623\u0646 \u0647\u0630\u0647 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629 \u062a\u0633\u062a\u062e\u062f\u0645 \u062a\u0642\u0646\u064a\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0648\u0642\u062f \u064a\u062a\u0645 \u062a\u0633\u062c\u064a\u0644\u0647\u0627 \u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u062c\u0648\u062f\u0629.",
      hi: "\u0915\u0943\u092a\u092f\u093e \u0927\u094d\u092f\u093e\u0928 \u0926\u0947\u0902 \u0915\u093f \u092f\u0939 \u0915\u0949\u0932 \u0915\u0943\u0924\u094d\u0930\u093f\u092e \u092c\u0941\u0926\u094d\u0927\u093f\u092e\u0924\u094d\u0924\u093e \u0924\u0915\u0928\u0940\u0915 \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u0930\u0924\u0940 \u0939\u0948 \u0914\u0930 \u0917\u0941\u0923\u0935\u0924\u094d\u0924\u093e \u0906\u0936\u094d\u0935\u093e\u0938\u0928 \u0915\u0947 \u0932\u093f\u090f \u0930\u093f\u0915\u0949\u0930\u094d\u0921 \u0915\u0940 \u091c\u093e \u0938\u0915\u0924\u0940 \u0939\u0948\u0964",
      sv: "Observera att detta samtal anv\u00e4nder artificiell intelligens och kan spelas in f\u00f6r kvalitetss\u00e4kring.",
      pl: "Prosimy o uwag\u0119, \u017ce ta rozmowa wykorzystuje sztuczn\u0105 inteligencj\u0119 i mo\u017ce by\u0107 nagrywana w celach zapewnienia jako\u015bci.",
    };

    return NextResponse.json({
      countries: countryOverviews,
      totalDncEntries: dncCount?.count || 0,
      disclosureTexts,
      summary: {
        totalCountries: allCountries.length,
        countriesCallable: countryOverviews.filter((c) => c.withinCallingHours).length,
        avgComplianceScore: Math.round(
          countryOverviews.reduce((sum, c) => sum + c.complianceScore, 0) / (countryOverviews.length || 1)
        ),
        countriesWithCalls: recentCallStats.length,
      },
    });
  } catch (error) {
    console.error("Compliance overview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
