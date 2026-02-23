"use client";

import { useState } from "react";
import { Search, Building2, MapPin, Calendar, CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

interface CompanyResult {
  companyNumber: string;
  companyName: string;
  entityType: string;
  companyTypeRaw: string;
  registeredAddress: string;
  incorporationDate: string | null;
  status: string;
  sicCodes: string[];
}

interface CompaniesHouseSearchProps {
  campaignId?: number;
  onAddToCampaign?: (companies: CompanyResult[], count: number) => void;
  onClose?: () => void;
}

function getEntityBadgeClass(entityType: string): string {
  switch (entityType) {
    case "Ltd":
    case "PLC":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800";
    case "LLP":
    case "LP":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800";
    case "Sole Trader":
    case "Partnership":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800";
    default:
      return "";
  }
}

export default function CompaniesHouseSearch({ campaignId, onAddToCampaign, onClose }: CompaniesHouseSearchProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [sicCode, setSicCode] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [source, setSource] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setErrorMessage("");
    setSuccessMessage("");
    setSelectedIds(new Set());
    setHasSearched(true);

    try {
      const response = await fetch("/api/connectors/companies-house/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          location: location.trim() || undefined,
          sicCode: sicCode.trim() || undefined,
          includeInactive,
        }),
      });

      if (response.status === 429) {
        setErrorMessage("Too many searches. Please wait a moment and try again.");
        setResults([]);
        return;
      }

      if (!response.ok) {
        setErrorMessage("Failed to search Companies House. Please try again.");
        setResults([]);
        return;
      }

      const data = await response.json();
      setResults(data.results || []);
      setTotalResults(data.totalResults || 0);
      setSource(data.source || "");
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelect = (companyNumber: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyNumber)) {
        next.delete(companyNumber);
      } else {
        next.add(companyNumber);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((r) => r.companyNumber)));
    }
  };

  const handleAddToCampaign = async () => {
    if (selectedIds.size === 0 || !campaignId) return;
    setIsAdding(true);
    setErrorMessage("");

    const selectedCompanies = results.filter((r) => selectedIds.has(r.companyNumber));

    try {
      const response = await fetch("/api/connectors/companies-house/add-to-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          companies: selectedCompanies,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to add companies to campaign.");
        return;
      }

      const data = await response.json();
      setSuccessMessage(data.message);
      setSelectedIds(new Set());

      if (onAddToCampaign) {
        onAddToCampaign(selectedCompanies, data.created);
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const allSelected = results.length > 0 && selectedIds.size === results.length;

  return (
    <div className="flex flex-col h-full" data-testid="companies-house-search">
      <div className="p-4 space-y-3 border-b">
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
          <h2 className="text-lg font-semibold" data-testid="text-companies-house-title">Search Companies House</h2>
          <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">Free</Badge>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="space-y-3"
        >
          <div className="flex gap-2">
            <Input
              data-testid="input-company-search"
              placeholder="Search company name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isSearching || !query.trim()}
              data-testid="button-search-companies"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="hidden sm:inline ml-2">Search</span>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-sm text-muted-foreground"
            data-testid="button-toggle-filters"
          >
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Filters
          </button>

          {showFilters && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="location" className="text-sm text-muted-foreground mb-1 block">Location</Label>
                  <Input
                    id="location"
                    data-testid="input-location-filter"
                    placeholder="e.g. London, Manchester"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="sicCode" className="text-sm text-muted-foreground mb-1 block">SIC Code</Label>
                  <Input
                    id="sicCode"
                    data-testid="input-sic-filter"
                    placeholder="e.g. 62012"
                    value={sicCode}
                    onChange={(e) => setSicCode(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="includeInactive"
                  checked={includeInactive}
                  onCheckedChange={setIncludeInactive}
                  data-testid="switch-include-inactive"
                />
                <Label htmlFor="includeInactive" className="text-sm">Include dissolved companies</Label>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {errorMessage && (
          <Alert variant="destructive" data-testid="alert-error">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert data-testid="alert-success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {source === "mock" && results.length > 0 && (
          <Alert data-testid="alert-mock-data">
            <AlertDescription className="text-sm">
              Companies House API key not configured. Showing sample results for demonstration.
            </AlertDescription>
          </Alert>
        )}

        {isSearching && (
          <div className="flex items-center justify-center py-12" data-testid="loading-search">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Searching Companies House...</span>
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && !errorMessage && (
          <div className="text-center py-12 text-muted-foreground" data-testid="text-no-results">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No companies found</p>
            <p className="text-sm mt-1">Try a different search term or adjust your filters</p>
          </div>
        )}

        {!isSearching && !hasSearched && (
          <div className="text-center py-12 text-muted-foreground" data-testid="text-search-prompt">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Search for UK companies</p>
            <p className="text-sm mt-1">Find companies by name, location, or industry code</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground" data-testid="text-result-count">
                {totalResults} result{totalResults !== 1 ? "s" : ""} found
              </p>
              {campaignId && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-sm text-primary"
                  data-testid="button-select-all"
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            <div className="space-y-2">
              {results.map((company) => (
                <Card
                  key={company.companyNumber}
                  className={`transition-colors ${selectedIds.has(company.companyNumber) ? "ring-2 ring-primary" : ""}`}
                  data-testid={`card-company-${company.companyNumber}`}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      {campaignId && (
                        <div className="pt-1 shrink-0">
                          <Checkbox
                            checked={selectedIds.has(company.companyNumber)}
                            onCheckedChange={() => toggleSelect(company.companyNumber)}
                            className="h-5 w-5"
                            data-testid={`checkbox-company-${company.companyNumber}`}
                          />
                        </div>
                      )}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => campaignId && toggleSelect(company.companyNumber)}
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <h3 className="font-medium text-sm sm:text-base leading-tight" data-testid={`text-company-name-${company.companyNumber}`}>
                            {company.companyName}
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-xs no-default-hover-elevate no-default-active-elevate ${getEntityBadgeClass(company.entityType)}`}
                              data-testid={`badge-entity-type-${company.companyNumber}`}
                            >
                              {company.entityType}
                            </Badge>
                            {company.status === "active" ? (
                              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-status-${company.companyNumber}`}>
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-status-${company.companyNumber}`}>
                                {company.status}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="mt-1.5 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate" data-testid={`text-address-${company.companyNumber}`}>{company.registeredAddress}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                            {company.incorporationDate && (
                              <span className="flex items-center gap-1" data-testid={`text-incorporation-${company.companyNumber}`}>
                                <Calendar className="h-3 w-3" />
                                {new Date(company.incorporationDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                            <span data-testid={`text-company-number-${company.companyNumber}`}>
                              #{company.companyNumber}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {campaignId && selectedIds.size > 0 && (
        <div className="sticky bottom-0 border-t bg-background p-3 z-50">
          <Alert className="mb-3">
            <AlertDescription className="text-xs">
              Phone numbers are not available from Companies House. Add phone numbers manually or from another source after importing.
            </AlertDescription>
          </Alert>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium" data-testid="text-selected-count">
              {selectedIds.size} compan{selectedIds.size !== 1 ? "ies" : "y"} selected
            </span>
            <Button
              onClick={handleAddToCampaign}
              disabled={isAdding}
              data-testid="button-add-to-campaign"
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add to Campaign
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
