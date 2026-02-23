import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { normalizePhoneE164 } from "@/lib/phone-normalize";
import { parse as csvParse } from "csv-parse/sync";
import * as XLSX from "xlsx";

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
    if (!mapping.phone && PHONE_HEADER_VARIATIONS.includes(h)) mapping.phone = headers[i];
    if (!mapping.name && NAME_HEADER_VARIATIONS.includes(h)) mapping.name = headers[i];
    if (!mapping.email && EMAIL_HEADER_VARIATIONS.includes(h)) mapping.email = headers[i];
    if (!mapping.company && COMPANY_HEADER_VARIATIONS.includes(h)) mapping.company = headers[i];
  }

  return mapping;
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded. Please select a CSV or Excel file." }, { status: 400 });
    }

    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ];
    const filename = file.name.toLowerCase();
    const validExt = filename.endsWith(".csv") || filename.endsWith(".xlsx") || filename.endsWith(".xls");
    if (!allowedTypes.includes(file.type) && !validExt) {
      return NextResponse.json({ error: "Invalid file type. Please upload a CSV or Excel file." }, { status: 400 });
    }

    const isExcel = filename.endsWith(".xlsx") || filename.endsWith(".xls");
    const maxCsvSize = 10 * 1024 * 1024;
    const maxXlsxSize = 20 * 1024 * 1024;

    if (!isExcel && file.size > maxCsvSize) {
      return NextResponse.json({ error: "File too large. Maximum 10MB for CSV files." }, { status: 400 });
    }
    if (isExcel && file.size > maxXlsxSize) {
      return NextResponse.json({ error: "File too large. Maximum 20MB for Excel files." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { headers, rows, error } = parseFileToRows(buffer, file.name);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const maxRows = 10000;
    if (rows.length > maxRows) {
      return NextResponse.json({
        error: `Too many rows. Maximum ${maxRows.toLocaleString()} rows allowed. Your file has ${rows.length.toLocaleString()} rows.`,
      }, { status: 400 });
    }

    const hasHeaders = headers.some(h => {
      const lower = h.toLowerCase();
      return PHONE_HEADER_VARIATIONS.includes(lower)
        || NAME_HEADER_VARIATIONS.includes(lower)
        || EMAIL_HEADER_VARIATIONS.includes(lower)
        || COMPANY_HEADER_VARIATIONS.includes(lower);
    });

    const columnMapping = hasHeaders ? detectColumnMapping(headers) : {};

    const defaultCountry = (formData.get("defaultCountry") as string) || "GB";
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

    return NextResponse.json({
      filename: file.name,
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
  } catch (error) {
    return handleRouteError(error, "CSV Upload");
  }
}
