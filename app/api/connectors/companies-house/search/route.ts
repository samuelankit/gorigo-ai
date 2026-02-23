import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

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
  };
  return typeMap[raw] || raw || "Unknown";
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

const searchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  location: z.string().optional(),
  sicCode: z.string().optional(),
  includeInactive: z.boolean().optional().default(false),
  itemsPerPage: z.number().optional().default(20),
  startIndex: z.number().optional().default(0),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = searchSchema.parse(body);
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;

    if (!apiKey) {
      const mockResults = generateMockCompaniesHouseResults(parsed.query, parsed.includeInactive);
      return NextResponse.json({
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
      return NextResponse.json({ error: "Companies House rate limit reached. Please wait a moment and try again." }, { status: 429 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to search Companies House. Please try again." }, { status: 502 });
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

    return NextResponse.json({
      results: filtered,
      totalResults: data.total_results || filtered.length,
      query: parsed.query,
      source: "companies_house",
    });
  } catch (error) {
    return handleRouteError(error, "Companies House Search");
  }
}
