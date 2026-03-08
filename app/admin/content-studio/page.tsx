"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Library,
  Mic,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Phone,
  ThumbsUp,
  Quote,
  PackagePlus,
  Loader2,
} from "lucide-react";

interface Industry {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string;
  complianceNotes: string | null;
  displayOrder: number;
}

interface Template {
  id: number;
  industryId: number;
  templateType: string;
  title: string;
  content: string;
  voiceProfile: string | null;
  tone: string | null;
  language: string | null;
  complianceDisclaimer: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface VoiceProfile {
  id: number;
  name: string;
  description: string | null;
  bestFor: string | null;
  pitch: number;
  speed: number;
  warmth: number;
  emphasis: number;
  pauseLength: number;
  ttsVoiceId: string | null;
  isSystem: boolean;
}

interface CaseStudy {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  heroImage: string | null;
  challenge: string | null;
  solution: string | null;
  results: string | null;
  testimonialQuote: string | null;
  testimonialAuthor: string | null;
  testimonialRole: string | null;
  roiPercentage: number | null;
  costReduction: number | null;
  callsHandled: number | null;
  customerSatisfaction: number | null;
  featured: boolean;
  industryName: string;
  industrySlug: string;
  industryIcon: string;
}

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  inbound_call_script: "Inbound Call Script",
  outbound_call_script: "Outbound Call Script",
  email_template: "Email Template",
  sms_template: "SMS Template",
  faq_answer: "FAQ Answer",
  voicemail_greeting: "Voicemail Greeting",
  hold_message: "Hold Message",
  ivr_menu: "IVR Menu Script",
  escalation_script: "Escalation Script",
  follow_up: "Follow-Up Template",
};

const TEMPLATE_TYPES = Object.keys(TEMPLATE_TYPE_LABELS);

const fetchData = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

function ParamBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2" data-testid={`param-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-violet-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export default function ContentStudioPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("templates");

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industriesLoading, setIndustriesLoading] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);

  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [voiceProfilesLoading, setVoiceProfilesLoading] = useState(false);

  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [caseStudiesLoading, setCaseStudiesLoading] = useState(false);
  const [expandedCaseStudy, setExpandedCaseStudy] = useState<number | null>(null);

  const [seeding, setSeeding] = useState(false);
  const [hasData, setHasData] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.globalRole !== "SUPERADMIN") {
          window.location.href = "/dashboard";
        } else {
          setUser(d.user);
        }
      });
  }, []);

  const loadIndustries = useCallback(() => {
    setIndustriesLoading(true);
    fetchData("/api/admin/content-studio?tab=industries")
      .then((data) => {
        if (data?.industries) {
          setIndustries(data.industries);
          setHasData(data.industries.length > 0);
          if (data.industries.length > 0 && !selectedIndustry) {
            setSelectedIndustry(data.industries[0]);
          }
        } else {
          setHasData(false);
        }
      })
      .catch((e) => {
        console.error("Fetch industries failed:", e);
        setHasData(false);
      })
      .finally(() => setIndustriesLoading(false));
  }, []);

  const loadTemplates = useCallback((industryId: number, type: string) => {
    setTemplatesLoading(true);
    const typeParam = type !== "all" ? `&type=${type}` : "";
    fetchData(`/api/admin/content-studio?tab=templates&industryId=${industryId}${typeParam}`)
      .then((data) => {
        if (data?.templates) setTemplates(data.templates);
      })
      .catch((e) => console.error("Fetch templates failed:", e))
      .finally(() => setTemplatesLoading(false));
  }, []);

  const loadVoiceProfiles = useCallback(() => {
    setVoiceProfilesLoading(true);
    fetchData("/api/admin/content-studio?tab=voice-profiles")
      .then((data) => {
        if (data?.voiceProfiles) setVoiceProfiles(data.voiceProfiles);
      })
      .catch((e) => console.error("Fetch voice profiles failed:", e))
      .finally(() => setVoiceProfilesLoading(false));
  }, []);

  const loadCaseStudies = useCallback(() => {
    setCaseStudiesLoading(true);
    fetchData("/api/public/case-studies")
      .then((data) => {
        if (data?.caseStudies) setCaseStudies(data.caseStudies);
      })
      .catch((e) => console.error("Fetch case studies failed:", e))
      .finally(() => setCaseStudiesLoading(false));
  }, []);

  const handleSeedContent = useCallback(async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/content-studio/seed", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Seed failed");
      const data = await res.json();
      if (!data.skipped) {
        setHasData(true);
        loadIndustries();
        loadVoiceProfiles();
        loadCaseStudies();
      }
    } catch (e) {
      console.error("Seed content studio failed:", e);
    } finally {
      setSeeding(false);
    }
  }, [loadIndustries, loadVoiceProfiles, loadCaseStudies]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === "templates") loadIndustries();
    if (activeTab === "voices") loadVoiceProfiles();
    if (activeTab === "cases") loadCaseStudies();
  }, [activeTab, user, loadIndustries, loadVoiceProfiles, loadCaseStudies]);

  useEffect(() => {
    if (!user || !selectedIndustry) return;
    loadTemplates(selectedIndustry.id, typeFilter);
    setExpandedTemplate(null);
  }, [selectedIndustry, typeFilter, user, loadTemplates]);

  if (!user) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto" data-testid="page-content-studio">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
          <Library className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            Content Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Industry templates, voice profiles, and case studies
          </p>
        </div>
      </div>

      {hasData === false && !industriesLoading && (
        <Card data-testid="card-empty-content-studio">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-violet-500/10">
              <PackagePlus className="w-7 h-7 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-foreground">No content found</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Load starter content to populate industries, voice profiles, templates, and case studies with realistic, usable data.
              </p>
            </div>
            <Button
              onClick={handleSeedContent}
              disabled={seeding}
              data-testid="button-seed-content"
            >
              {seeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading content...
                </>
              ) : (
                <>
                  <PackagePlus className="mr-2 h-4 w-4" />
                  Load Starter Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList data-testid="tabs-content-studio">
          <TabsTrigger value="templates" data-testid="tab-templates">Industry Templates</TabsTrigger>
          <TabsTrigger value="voices" data-testid="tab-voices">Voice Profiles</TabsTrigger>
          <TabsTrigger value="cases" data-testid="tab-cases">Case Studies</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {industriesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Skeleton className="h-96" />
                <div className="lg:col-span-3 space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="space-y-1" data-testid="industry-list">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  Industries ({industries.length})
                </p>
                {industries.map((ind) => (
                  <Button
                    key={ind.id}
                    variant={selectedIndustry?.id === ind.id ? "secondary" : "ghost"}
                    className={`w-full justify-start text-left text-sm toggle-elevate ${selectedIndustry?.id === ind.id ? "toggle-elevated" : ""}`}
                    onClick={() => setSelectedIndustry(ind)}
                    data-testid={`button-industry-${ind.id}`}
                  >
                    <span className="mr-2 text-base">{ind.icon}</span>
                    <span className="truncate">{ind.name}</span>
                  </Button>
                ))}
              </div>

              <div className="lg:col-span-3 space-y-4">
                {selectedIndustry && (
                  <>
                    {selectedIndustry.complianceNotes && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3" data-testid="compliance-notes">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{selectedIndustry.complianceNotes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-muted-foreground">Filter by type:</span>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-48" data-testid="select-template-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {TEMPLATE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{TEMPLATE_TYPE_LABELS[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {templatesLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
                      </div>
                    ) : templates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No templates found for this industry{typeFilter !== "all" ? ` with type "${TEMPLATE_TYPE_LABELS[typeFilter]}"` : ""}.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {templates.map((tpl) => (
                          <Card
                            key={tpl.id}
                            className="cursor-pointer hover-elevate"
                            onClick={() => setExpandedTemplate(expandedTemplate === tpl.id ? null : tpl.id)}
                            data-testid={`card-template-${tpl.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm" data-testid={`text-template-title-${tpl.id}`}>
                                    {tpl.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <Badge variant="outline" className="text-xs" data-testid={`badge-type-${tpl.id}`}>
                                      {TEMPLATE_TYPE_LABELS[tpl.templateType] || tpl.templateType}
                                    </Badge>
                                    {tpl.voiceProfile && (
                                      <Badge variant="secondary" className="text-xs" data-testid={`badge-voice-${tpl.id}`}>
                                        {tpl.voiceProfile}
                                      </Badge>
                                    )}
                                    {tpl.tone && (
                                      <Badge variant="secondary" className="text-xs" data-testid={`badge-tone-${tpl.id}`}>
                                        {tpl.tone}
                                      </Badge>
                                    )}
                                    {tpl.language && (
                                      <Badge variant="outline" className="text-xs" data-testid={`badge-lang-${tpl.id}`}>
                                        {tpl.language}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {expandedTemplate === tpl.id ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                              </div>
                              {expandedTemplate === tpl.id && (
                                <div className="mt-4 space-y-3" data-testid={`content-template-${tpl.id}`}>
                                  <div className="rounded-md bg-muted/50 p-3">
                                    <pre className="text-sm whitespace-pre-wrap font-sans">{tpl.content}</pre>
                                  </div>
                                  {tpl.complianceDisclaimer && (
                                    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                      <p className="text-xs text-muted-foreground">{tpl.complianceDisclaimer}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="voices" className="space-y-4">
          {voiceProfilesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
          ) : voiceProfiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No voice profiles found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="voice-profiles-grid">
              {voiceProfiles.map((vp) => (
                <Card key={vp.id} data-testid={`card-voice-${vp.id}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mic className="h-4 w-4 text-violet-500" />
                      {vp.name}
                    </CardTitle>
                    {vp.isSystem && <Badge variant="outline" className="text-xs">System</Badge>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {vp.description && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-voice-desc-${vp.id}`}>
                        {vp.description}
                      </p>
                    )}
                    {vp.bestFor && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Best for:</span> {vp.bestFor}
                      </p>
                    )}
                    <div className="space-y-2" data-testid={`params-voice-${vp.id}`}>
                      <ParamBar label="Pitch" value={vp.pitch ?? 1.0} max={1.5} />
                      <ParamBar label="Speed" value={vp.speed ?? 1.0} max={1.5} />
                      <ParamBar label="Warmth" value={vp.warmth ?? 0.5} max={1.0} />
                      <ParamBar label="Emphasis" value={vp.emphasis ?? 0.5} max={1.0} />
                      <ParamBar label="Pause" value={vp.pauseLength ?? 0.3} max={1.0} />
                    </div>
                    {vp.ttsVoiceId && (
                      <p className="text-xs text-muted-foreground font-mono" data-testid={`text-voice-tts-${vp.id}`}>
                        TTS: {vp.ttsVoiceId}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cases" className="space-y-4">
          {caseStudiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : caseStudies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No published case studies found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="case-studies-grid">
              {caseStudies.map((cs) => (
                <Card
                  key={cs.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setExpandedCaseStudy(expandedCaseStudy === cs.id ? null : cs.id)}
                  data-testid={`card-case-${cs.id}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm" data-testid={`text-case-title-${cs.id}`}>{cs.title}</p>
                        {cs.subtitle && (
                          <p className="text-xs text-muted-foreground mt-1">{cs.subtitle}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0" data-testid={`badge-case-industry-${cs.id}`}>
                        {cs.industryIcon} {cs.industryName}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {cs.roiPercentage != null && (
                        <div className="text-center" data-testid={`stat-roi-${cs.id}`}>
                          <TrendingUp className="h-4 w-4 mx-auto text-green-500 mb-1" />
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{cs.roiPercentage}%</p>
                          <p className="text-xs text-muted-foreground">ROI</p>
                        </div>
                      )}
                      {cs.costReduction != null && (
                        <div className="text-center" data-testid={`stat-cost-${cs.id}`}>
                          <DollarSign className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{cs.costReduction}%</p>
                          <p className="text-xs text-muted-foreground">Cost Reduction</p>
                        </div>
                      )}
                      {cs.callsHandled != null && (
                        <div className="text-center" data-testid={`stat-calls-${cs.id}`}>
                          <Phone className="h-4 w-4 mx-auto text-violet-500 mb-1" />
                          <p className="text-lg font-bold">{cs.callsHandled.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Calls Handled</p>
                        </div>
                      )}
                      {cs.customerSatisfaction != null && (
                        <div className="text-center" data-testid={`stat-csat-${cs.id}`}>
                          <ThumbsUp className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{cs.customerSatisfaction}%</p>
                          <p className="text-xs text-muted-foreground">Satisfaction</p>
                        </div>
                      )}
                    </div>

                    {expandedCaseStudy === cs.id && (
                      <div className="space-y-3 pt-2 border-t" data-testid={`content-case-${cs.id}`}>
                        {cs.challenge && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Challenge</p>
                            <p className="text-sm">{cs.challenge}</p>
                          </div>
                        )}
                        {cs.solution && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Solution</p>
                            <p className="text-sm">{cs.solution}</p>
                          </div>
                        )}
                        {cs.results && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Results</p>
                            <p className="text-sm">{cs.results}</p>
                          </div>
                        )}
                        {cs.testimonialQuote && (
                          <div className="rounded-md bg-muted/50 p-3 flex items-start gap-2">
                            <Quote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm italic">{cs.testimonialQuote}</p>
                              {(cs.testimonialAuthor || cs.testimonialRole) && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  — {cs.testimonialAuthor}{cs.testimonialRole ? `, ${cs.testimonialRole}` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end">
                      {expandedCaseStudy === cs.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
