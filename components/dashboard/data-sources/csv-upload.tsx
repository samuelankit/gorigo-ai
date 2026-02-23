"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, ArrowLeft, Smartphone, Loader2 } from "lucide-react";

interface ColumnMapping {
  phone?: string;
  name?: string;
  email?: string;
  company?: string;
}

interface UploadPreview {
  filename: string;
  totalRows: number;
  headers: string[];
  headersDetected: boolean;
  columnMapping: ColumnMapping;
  preview: string[][];
  validation: {
    valid: number;
    invalid: number;
    invalidRows: Array<{ row: number; reason: string }>;
  };
  defaultCountry: string;
}

interface ConfirmResult {
  created: number;
  skippedInvalid: number;
  duplicatesSkipped: number;
  errors: Array<{ row: number; reason: string }>;
  totalProcessed: number;
}

interface CsvUploadProps {
  campaignId?: number;
  orgId?: number;
  onComplete?: (result: ConfirmResult) => void;
  onCancel?: () => void;
}

export function CsvUpload({ campaignId, orgId = 1, onComplete, onCancel }: CsvUploadProps) {
  const [step, setStep] = useState<"upload" | "mapping" | "result">("upload");
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [defaultCountry, setDefaultCountry] = useState("GB");
  const [dragActive, setDragActive] = useState(false);
  const [isMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("defaultCountry", defaultCountry);

    try {
      const res = await fetch("/api/connectors/csv/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed. Please try again.");
        return;
      }

      setPreview(data);
      setColumnMapping(data.columnMapping || {});
      setFirstRowIsHeader(data.headersDetected);
      setStep("mapping");
    } catch {
      setError("Upload failed. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }, [defaultCountry]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch("/api/connectors/csv/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(campaignId ? { campaignId } : {}),
          orgId,
          headers: preview.headers,
          rows: firstRowIsHeader ? preview.preview : [preview.headers, ...preview.preview],
          columnMapping,
          defaultCountry,
          skipInvalid,
          skipDuplicates,
          firstRowIsHeader,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to import contacts.");
        return;
      }

      setResult(data);
      setStep("result");
      onComplete?.(data);
    } catch {
      setError("Import failed. Please check your connection and try again.");
    } finally {
      setConfirming(false);
    }
  };

  const updateMapping = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value === "__none__" ? undefined : value,
    }));
  };

  if (step === "result" && result) {
    return (
      <div className="space-y-4" data-testid="csv-result">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          <h3 className="text-lg font-semibold">Import Complete</h3>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-1">
              <span className="text-muted-foreground">Contacts Created</span>
              <Badge variant="default" data-testid="text-created-count">{result.created}</Badge>
            </div>
            {result.skippedInvalid > 0 && (
              <div className="flex justify-between items-center flex-wrap gap-1">
                <span className="text-muted-foreground">Skipped (Invalid)</span>
                <Badge variant="secondary">{result.skippedInvalid}</Badge>
              </div>
            )}
            {result.duplicatesSkipped > 0 && (
              <div className="flex justify-between items-center flex-wrap gap-1">
                <span className="text-muted-foreground">Duplicates Skipped</span>
                <Badge variant="secondary">{result.duplicatesSkipped}</Badge>
              </div>
            )}
            <div className="flex justify-between items-center flex-wrap gap-1">
              <span className="text-muted-foreground">Total Processed</span>
              <span>{result.totalProcessed}</span>
            </div>
          </CardContent>
        </Card>

        {result.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {result.errors.length} row(s) had errors:
              <ul className="mt-2 space-y-1 text-sm">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.reason}</li>
                ))}
                {result.errors.length > 5 && <li>...and {result.errors.length - 5} more</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={onCancel} className="w-full" data-testid="button-done">
          Done
        </Button>
      </div>
    );
  }

  if (step === "mapping" && preview) {
    return (
      <div className="space-y-4" data-testid="csv-mapping">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setStep("upload")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">Map Columns</h3>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">
            {preview.filename} — {preview.totalRows.toLocaleString()} rows
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {preview.validation.valid > 0 && (
              <Badge variant="default" data-testid="badge-valid">{preview.validation.valid} valid</Badge>
            )}
            {preview.validation.invalid > 0 && (
              <Badge variant="destructive" data-testid="badge-invalid">{preview.validation.invalid} invalid</Badge>
            )}
          </div>
        </div>

        {!preview.headersDetected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              We couldn&apos;t detect column headers. Is row 1 a header or data?
              <div className="mt-2 flex gap-2 flex-wrap">
                <Button
                  variant={firstRowIsHeader ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFirstRowIsHeader(true)}
                  data-testid="button-row1-header"
                >
                  Row 1 is a header
                </Button>
                <Button
                  variant={!firstRowIsHeader ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFirstRowIsHeader(false)}
                  data-testid="button-row1-data"
                >
                  Row 1 is data
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Label className="text-sm font-medium">Column Mapping</Label>
          <div className="grid gap-3">
            {[
              { key: "phone" as const, label: "Phone Number", required: true },
              { key: "name" as const, label: "Contact Name", required: false },
              { key: "email" as const, label: "Email", required: false },
              { key: "company" as const, label: "Company", required: false },
            ].map(({ key, label, required }) => (
              <Card key={key} className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <span className="text-sm font-medium">{label}</span>
                    {required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  </div>
                  <Select
                    value={columnMapping[key] || "__none__"}
                    onValueChange={(v) => updateMapping(key, v)}
                  >
                    <SelectTrigger className="flex-1" data-testid={`select-mapping-${key}`}>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Not mapped —</SelectItem>
                      {preview.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Preview (first {Math.min(preview.preview.length, 5)} rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {preview.preview.slice(0, 5).map((row, rowIdx) => (
                  <div key={rowIdx} className="text-xs p-2 rounded-md bg-muted/50 space-y-1">
                    {row.map((cell, cellIdx) => (
                      <div key={cellIdx} className="flex gap-2 flex-wrap">
                        <span className="text-muted-foreground font-mono min-w-[80px]">
                          {preview.headers[cellIdx] || `Col ${cellIdx + 1}`}:
                        </span>
                        <span className="break-all">{cell || "—"}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {preview.validation.invalidRows.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {preview.validation.invalidRows.slice(0, 5).map((e, i) => (
                  <div key={i} className="text-sm">Row {e.row}: {e.reason}</div>
                ))}
                {preview.validation.invalidRows.length > 5 && (
                  <div className="text-sm text-muted-foreground">
                    ...and {preview.validation.invalidRows.length - 5} more
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipInvalid}
                onChange={(e) => setSkipInvalid(e.target.checked)}
                className="rounded"
                data-testid="checkbox-skip-invalid"
              />
              <span className="text-sm">Skip invalid rows</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="rounded"
                data-testid="checkbox-skip-duplicates"
              />
              <span className="text-sm">Skip recent duplicates</span>
            </label>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="sticky bottom-0 bg-background pt-2 pb-1 border-t flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep("upload")}
            className="flex-1"
            data-testid="button-back-upload"
          >
            Back
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!columnMapping.phone || confirming}
            className="flex-1"
            data-testid="button-confirm-import"
          >
            {confirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importing...
              </>
            ) : (
              `Import ${preview.totalRows.toLocaleString()} Contacts`
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="csv-upload">
      <h3 className="text-lg font-semibold">Upload Contacts</h3>

      {isMobile && (
        <Alert>
          <Smartphone className="h-4 w-4" />
          <AlertDescription>
            For large files, try connecting your Google Sheets instead — it&apos;s easier on mobile!
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Label className="text-sm">Default Country</Label>
        <Select value={defaultCountry} onValueChange={setDefaultCountry}>
          <SelectTrigger className="w-[140px]" data-testid="select-country">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GB">UK (+44)</SelectItem>
            <SelectItem value="US">US (+1)</SelectItem>
            <SelectItem value="AU">Australia (+61)</SelectItem>
            <SelectItem value="CA">Canada (+1)</SelectItem>
            <SelectItem value="IE">Ireland (+353)</SelectItem>
            <SelectItem value="DE">Germany (+49)</SelectItem>
            <SelectItem value="FR">France (+33)</SelectItem>
            <SelectItem value="IN">India (+91)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        data-testid="dropzone"
      >
        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Processing your file...</p>
            <Progress value={50} className="w-48 mx-auto" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center gap-3">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {dragActive ? "Drop your file here" : "Drag & drop your file here"}
            </p>
            <p className="text-xs text-muted-foreground">
              CSV (max 10MB) or Excel (max 20MB) — up to 10,000 rows
            </p>
            <label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                data-testid="input-file"
              />
              <Button variant="outline" asChild className="cursor-pointer">
                <span data-testid="button-browse">Browse Files</span>
              </Button>
            </label>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {onCancel && (
        <Button variant="ghost" onClick={onCancel} className="w-full" data-testid="button-cancel">
          Cancel
        </Button>
      )}
    </div>
  );
}
