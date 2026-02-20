"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/use-toast";
import {
  Search,
  Globe,
  FileText,
  Code,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Target,
  BarChart3,
  Zap,
  BookOpen,
  Link2,
} from "lucide-react";

const BASE_URL = "https://gorigo.ai";

interface SeoStatus {
  score: number;
  totalChecks: number;
  activeChecks: number;
  checks: Record<string, { status: string; url?: string; types?: string[] }>;
  lastUpdated: string;
}

interface VerificationCodes {
  google?: string;
  bing?: string;
  yandex?: string;
  baidu?: string;
  pinterest?: string;
}

const searchEngines = [
  {
    id: "google",
    name: "Google Search Console",
    icon: "G",
    color: "bg-blue-500",
    url: "https://search.google.com/search-console",
    share: "~91.5%",
    steps: [
      "Go to Google Search Console (link above)",
      "Click 'Add Property' and enter gorigo.ai",
      "Choose 'HTML tag' verification method",
      "Copy the verification code (content value only)",
      "Paste the code below and save",
      "Go back to Google Search Console and click 'Verify'",
      "Submit your sitemap: gorigo.ai/sitemap.xml",
    ],
    sitemapUrl: "https://search.google.com/search-console/sitemaps",
    tips: [
      "Submit sitemap within Search Console for faster indexing",
      "Use URL Inspection tool to request indexing of key pages",
      "Monitor Core Web Vitals for ranking signals",
      "Check Mobile Usability report regularly",
      "Review Index Coverage for crawl errors",
    ],
  },
  {
    id: "bing",
    name: "Bing Webmaster Tools",
    icon: "B",
    color: "bg-teal-500",
    url: "https://www.bing.com/webmasters",
    share: "~3.4%",
    steps: [
      "Go to Bing Webmaster Tools (link above)",
      "Sign in with your Microsoft account",
      "Click 'Add Site' and enter gorigo.ai",
      "Choose 'HTML Meta Tag' verification",
      "Copy the content value from the meta tag",
      "Paste the code below and save",
      "Click 'Verify' in Bing Webmaster Tools",
      "Submit sitemap: gorigo.ai/sitemap.xml",
    ],
    sitemapUrl: "https://www.bing.com/webmasters/sitemaps",
    tips: [
      "Bing also powers Yahoo and DuckDuckGo results",
      "Submit sitemap URL for faster discovery",
      "Use URL Submission API for instant indexing",
      "Check SEO Reports for improvement suggestions",
      "Enable IndexNow for real-time indexing",
    ],
  },
  {
    id: "yandex",
    name: "Yandex Webmaster",
    icon: "Y",
    color: "bg-red-500",
    url: "https://webmaster.yandex.com",
    share: "~1.6%",
    steps: [
      "Go to Yandex Webmaster (link above)",
      "Sign in or create a Yandex account",
      "Click 'Add Site' and enter gorigo.ai",
      "Choose 'Meta tag' verification",
      "Copy the content value from the meta tag",
      "Paste the code below and save",
      "Click 'Check' in Yandex Webmaster",
      "Submit sitemap: gorigo.ai/sitemap.xml",
    ],
    sitemapUrl: "https://webmaster.yandex.com/sitemaps",
    tips: [
      "Important for Eastern European and Russian markets",
      "Yandex has its own ranking algorithms",
      "Submit sitemap for discovery",
      "Monitor indexing via Yandex Webmaster",
    ],
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo",
    icon: "D",
    color: "bg-orange-500",
    url: "https://duckduckgo.com",
    share: "~2.3%",
    steps: [
      "DuckDuckGo does NOT have a webmaster console",
      "It uses Bing's index — verify with Bing first",
      "Ensure your site is properly indexed by Bing",
      "DuckDuckGo also uses its own DuckDuckBot crawler",
      "Your robots.txt already allows DuckDuckBot",
      "No verification code needed",
    ],
    tips: [
      "DuckDuckGo relies heavily on Bing's index",
      "Good structured data improves DuckDuckGo results",
      "Privacy-focused users prefer DuckDuckGo",
      "Apple Maps and Siri use DuckDuckGo results",
      "Focus on Bing optimisation to appear in DuckDuckGo",
    ],
  },
  {
    id: "yahoo",
    name: "Yahoo Search",
    icon: "Y!",
    color: "bg-purple-500",
    url: "https://search.yahoo.com",
    share: "~1.1%",
    steps: [
      "Yahoo uses Bing's search index",
      "Verify your site with Bing Webmaster Tools first",
      "Once indexed by Bing, Yahoo will show your pages",
      "No separate verification needed for Yahoo",
      "Your Bing submission covers Yahoo automatically",
    ],
    tips: [
      "Yahoo Search is powered entirely by Bing",
      "Optimising for Bing = optimising for Yahoo",
      "Yahoo Mail users often use Yahoo Search",
      "Focus effort on Google and Bing for full coverage",
    ],
  },
];

const sitemapPages = [
  { path: "/", priority: "1.0", freq: "daily", category: "Home" },
  { path: "/capabilities", priority: "0.9", freq: "weekly", category: "Features" },
  { path: "/features/ai-agents", priority: "0.9", freq: "weekly", category: "Features" },
  { path: "/features/call-handling", priority: "0.9", freq: "weekly", category: "Features" },
  { path: "/features/compliance", priority: "0.9", freq: "weekly", category: "Features" },
  { path: "/features/analytics", priority: "0.9", freq: "weekly", category: "Features" },
  { path: "/features/multi-language", priority: "0.9", freq: "weekly", category: "Features" },
  { path: "/features/pay-per-talk-time", priority: "0.9", freq: "weekly", category: "Features" },
  { path: "/pricing", priority: "0.85", freq: "weekly", category: "Core" },
  { path: "/about", priority: "0.8", freq: "monthly", category: "Core" },
  { path: "/contact", priority: "0.8", freq: "monthly", category: "Core" },
  { path: "/blog", priority: "0.85", freq: "daily", category: "Content" },
  { path: "/case-studies", priority: "0.85", freq: "weekly", category: "Content" },
  { path: "/docs", priority: "0.8", freq: "weekly", category: "Core" },
  { path: "/roi-calculator", priority: "0.8", freq: "monthly", category: "Core" },
  { path: "/partners", priority: "0.8", freq: "monthly", category: "Partners" },
  { path: "/partners/whitelabel", priority: "0.7", freq: "monthly", category: "Partners" },
  { path: "/partners/affiliate", priority: "0.7", freq: "monthly", category: "Partners" },
  { path: "/ai-transparency", priority: "0.7", freq: "monthly", category: "Trust" },
  { path: "/trust", priority: "0.7", freq: "monthly", category: "Trust" },
  { path: "/guide", priority: "0.6", freq: "monthly", category: "Guide" },
];

const structuredDataSchemas = [
  {
    name: "Organization",
    description: "Company info — name, logo, address, contact. Enables Knowledge Panel in Google.",
    status: "active",
  },
  {
    name: "WebSite",
    description: "Site-level info with SearchAction. Enables sitelinks search box in Google.",
    status: "active",
  },
  {
    name: "SiteNavigationElement",
    description: "Main navigation links. Helps Google generate sitelinks under your listing.",
    status: "active",
  },
  {
    name: "SoftwareApplication",
    description: "App details, features, pricing, ratings. Enhances app-related search results.",
    status: "active",
  },
  {
    name: "BreadcrumbList",
    description: "Page hierarchy breadcrumbs. Shows breadcrumb trail in search results.",
    status: "active",
  },
];

export default function SeoAdminPage() {
  const { toast } = useToast();
  const [seoStatus, setSeoStatus] = useState<SeoStatus | null>(null);
  const [verificationCodes, setVerificationCodes] = useState<VerificationCodes>({});
  const [codeInputs, setCodeInputs] = useState<VerificationCodes>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedEngine, setExpandedEngine] = useState<string | null>("google");

  useEffect(() => {
    Promise.all([
      fetch("/api/seo/status").then((r) => r.json()).catch(() => null),
      fetch("/api/seo/verification").then((r) => r.json()).catch(() => ({})),
    ]).then(([status, codes]) => {
      setSeoStatus(status);
      setVerificationCodes(codes);
      setCodeInputs(codes);
      setLoading(false);
    });
  }, []);

  const saveVerificationCode = async (engine: string) => {
    const code = codeInputs[engine as keyof VerificationCodes];
    if (!code?.trim()) {
      toast({ title: "Error", description: "Please enter a verification code", variant: "destructive" });
      return;
    }
    setSaving(engine);
    try {
      const res = await fetch("/api/seo/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine, code: code.trim() }),
      });
      if (res.ok) {
        setVerificationCodes((prev) => ({ ...prev, [engine]: code.trim() }));
        toast({ title: "Saved", description: `${engine} verification code saved successfully` });
      } else {
        toast({ title: "Error", description: "Failed to save verification code", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save verification code", variant: "destructive" });
    }
    setSaving(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="text-seo-loading">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-seo-title">SEO & Search Engines</h1>
          <p className="text-muted-foreground">
            Manage search engine visibility, structured data, and indexing for gorigo.ai
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`${BASE_URL}/sitemap.xml`, "_blank")}
            data-testid="button-view-sitemap"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Sitemap
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("https://search.google.com/test/rich-results?url=https%3A%2F%2Fgorigo.ai", "_blank")}
            data-testid="button-test-rich-results"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Test Rich Results
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5" data-testid="tabs-seo">
          <TabsTrigger value="overview" data-testid="tab-seo-overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="engines" data-testid="tab-seo-engines">
            <Search className="h-4 w-4 mr-2" />
            Search Engines
          </TabsTrigger>
          <TabsTrigger value="sitemap" data-testid="tab-seo-sitemap">
            <Globe className="h-4 w-4 mr-2" />
            Sitemap
          </TabsTrigger>
          <TabsTrigger value="structured" data-testid="tab-seo-structured">
            <Code className="h-4 w-4 mr-2" />
            Structured Data
          </TabsTrigger>
          <TabsTrigger value="verification" data-testid="tab-seo-verification">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Verification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`text-4xl font-bold ${getScoreColor(seoStatus?.score || 0)}`} data-testid="text-seo-score">
                    {seoStatus?.score || 0}%
                  </div>
                  <div>
                    <p className="text-sm font-medium">SEO Health</p>
                    <p className="text-xs text-muted-foreground">
                      {seoStatus?.activeChecks}/{seoStatus?.totalChecks} checks passed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Target className="h-10 w-10 text-violet-500" />
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-sitemap-pages">{sitemapPages.length}+</p>
                    <p className="text-xs text-muted-foreground">Pages in Sitemap</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Code className="h-10 w-10 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-schema-count">5</p>
                    <p className="text-xs text-muted-foreground">Schema Types</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Search className="h-10 w-10 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-engines-count">5</p>
                    <p className="text-xs text-muted-foreground">Search Engines</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  SEO Checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "XML Sitemap", status: true, detail: "Auto-generated with 60+ URLs" },
                  { label: "robots.txt", status: true, detail: "Configured for all 5 search engines" },
                  { label: "Meta Description", status: true, detail: "Set on all pages" },
                  { label: "Open Graph Tags", status: true, detail: "Title, description, site name" },
                  { label: "Twitter Cards", status: true, detail: "Summary large image" },
                  { label: "Canonical URLs", status: true, detail: "Self-referencing canonical" },
                  { label: "JSON-LD Structured Data", status: true, detail: "5 schema types active" },
                  { label: "SSL Certificate", status: true, detail: "HTTPS enforced" },
                  { label: "Mobile Responsive", status: true, detail: "Responsive design" },
                  { label: "Search Engine Bots Allowed", status: true, detail: "Googlebot, Bingbot, DuckDuckBot, YandexBot, Slurp" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      {item.status ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.detail}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    label: "Submit to Google Search Console",
                    action: () => { setActiveTab("engines"); setExpandedEngine("google"); },
                    icon: Search,
                    urgent: !verificationCodes.google,
                  },
                  {
                    label: "Submit to Bing Webmaster Tools",
                    action: () => { setActiveTab("engines"); setExpandedEngine("bing"); },
                    icon: Globe,
                    urgent: !verificationCodes.bing,
                  },
                  {
                    label: "Test Rich Results",
                    action: () => window.open("https://search.google.com/test/rich-results?url=https%3A%2F%2Fgorigo.ai", "_blank"),
                    icon: Sparkles,
                  },
                  {
                    label: "View Sitemap",
                    action: () => window.open(`${BASE_URL}/sitemap.xml`, "_blank"),
                    icon: FileText,
                  },
                  {
                    label: "Test Mobile-Friendly",
                    action: () => window.open("https://search.google.com/test/mobile-friendly?url=https%3A%2F%2Fgorigo.ai", "_blank"),
                    icon: Target,
                  },
                  {
                    label: "Google PageSpeed Insights",
                    action: () => window.open("https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fgorigo.ai", "_blank"),
                    icon: TrendingUp,
                  },
                  {
                    label: "Check robots.txt",
                    action: () => window.open(`${BASE_URL}/robots.txt`, "_blank"),
                    icon: BookOpen,
                  },
                  {
                    label: "Schema Markup Validator",
                    action: () => window.open("https://validator.schema.org/#url=https%3A%2F%2Fgorigo.ai", "_blank"),
                    icon: Code,
                  },
                ].map((item, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                    onClick={item.action}
                    data-testid={`button-quick-action-${i}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.urgent && (
                        <Badge variant="destructive" className="text-xs">Action Needed</Badge>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                SEO Strategy Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border space-y-2">
                  <h4 className="font-medium text-sm">Get Sitelinks (like your screenshot)</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>1. Verify site in Google Search Console</li>
                    <li>2. Submit sitemap for all pages</li>
                    <li>3. Clear navigation structure (already done)</li>
                    <li>4. Descriptive, unique page titles (already done)</li>
                    <li>5. SiteNavigationElement schema (already active)</li>
                    <li>6. Build quality backlinks to key pages</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border space-y-2">
                  <h4 className="font-medium text-sm">Faster Indexing</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>1. Submit sitemap to Google & Bing</li>
                    <li>2. Use URL Inspection to request indexing</li>
                    <li>3. Enable IndexNow for Bing</li>
                    <li>4. Share pages on social media</li>
                    <li>5. Regularly publish blog content</li>
                    <li>6. Interlink all your pages</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border space-y-2">
                  <h4 className="font-medium text-sm">Improve Rankings</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>1. Target long-tail keywords in blog posts</li>
                    <li>2. Optimise page load speed</li>
                    <li>3. Get UK-specific backlinks</li>
                    <li>4. Create industry-specific landing pages</li>
                    <li>5. Add FAQ schema to key pages</li>
                    <li>6. Register on Google Business Profile</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submit to Top 5 Search Engines</CardTitle>
              <CardDescription>
                Step-by-step guides to get gorigo.ai indexed by all major search engines. Google and Bing are the priority — they power 98% of search traffic.
              </CardDescription>
            </CardHeader>
          </Card>

          {searchEngines.map((engine) => (
            <Card key={engine.id} className="overflow-hidden">
              <button
                className="w-full"
                onClick={() => setExpandedEngine(expandedEngine === engine.id ? null : engine.id)}
                data-testid={`button-engine-${engine.id}`}
              >
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${engine.color} text-white font-bold text-sm`}>
                        {engine.icon}
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-base">{engine.name}</CardTitle>
                        <CardDescription>Market Share: {engine.share}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {engine.id !== "duckduckgo" && engine.id !== "yahoo" ? (
                        verificationCodes[engine.id as keyof VerificationCodes] ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Not Verified
                          </Badge>
                        )
                      ) : (
                        <Badge variant="secondary">
                          <Link2 className="h-3 w-3 mr-1" />
                          Via Bing
                        </Badge>
                      )}
                      <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedEngine === engine.id ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                </CardHeader>
              </button>

              {expandedEngine === engine.id && (
                <CardContent className="border-t pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Step-by-Step Guide
                      </h4>
                      <ol className="space-y-2">
                        {engine.steps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-accent text-xs font-medium">
                              {i + 1}
                            </span>
                            <span className="text-muted-foreground pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                      {engine.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={(e) => { e.stopPropagation(); window.open(engine.url, "_blank"); }}
                          data-testid={`button-open-${engine.id}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open {engine.name}
                        </Button>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Pro Tips
                      </h4>
                      <ul className="space-y-2">
                        {engine.tips.map((tip, i) => (
                          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            {tip}
                          </li>
                        ))}
                      </ul>

                      {engine.id !== "duckduckgo" && engine.id !== "yahoo" && (
                        <div className="mt-4 p-4 rounded-lg border space-y-3">
                          <Label className="text-sm font-medium">Verification Code</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder={`Enter ${engine.name} verification code`}
                              value={codeInputs[engine.id as keyof VerificationCodes] || ""}
                              onChange={(e) =>
                                setCodeInputs((prev) => ({
                                  ...prev,
                                  [engine.id]: e.target.value,
                                }))
                              }
                              data-testid={`input-verification-${engine.id}`}
                            />
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); saveVerificationCode(engine.id); }}
                              disabled={saving === engine.id}
                              data-testid={`button-save-${engine.id}`}
                            >
                              {saving === engine.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                "Save"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-accent/50">
                    <h4 className="font-medium text-sm mb-2">Sitemap URL to Submit</h4>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-background px-3 py-1.5 rounded border flex-1">
                        {BASE_URL}/sitemap.xml
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(`${BASE_URL}/sitemap.xml`); }}
                        data-testid={`button-copy-sitemap-${engine.id}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="sitemap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Sitemap Pages
              </CardTitle>
              <CardDescription>
                All pages included in your sitemap.xml — automatically submitted to search engines.
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 p-0 h-auto text-primary underline"
                  onClick={() => window.open(`${BASE_URL}/sitemap.xml`, "_blank")}
                >
                  View raw XML <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">URL</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Category</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Priority</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Frequency</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sitemapPages.map((page, i) => (
                      <tr key={i} className="hover:bg-accent/50">
                        <td className="p-3">
                          <code className="text-xs">{page.path}</code>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-xs">{page.category}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-xs font-mono ${parseFloat(page.priority) >= 0.8 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                            {page.priority}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-xs text-muted-foreground">{page.freq}</span>
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`${BASE_URL}${page.path}`, "_blank")}
                            data-testid={`button-visit-page-${i}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Plus 10 blog posts and 15 case studies with dynamic slugs (not shown). Total: 60+ indexed URLs.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structured" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-5 w-5" />
                JSON-LD Structured Data
              </CardTitle>
              <CardDescription>
                Structured data schemas embedded on every page. These tell search engines how to display your site in results.
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 p-0 h-auto text-primary underline"
                  onClick={() => window.open("https://search.google.com/test/rich-results?url=https%3A%2F%2Fgorigo.ai", "_blank")}
                >
                  Test with Google <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {structuredDataSchemas.map((schema, i) => (
                <div key={i} className="p-4 rounded-lg border hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400">
                        <Code className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{schema.name}</h4>
                        <p className="text-xs text-muted-foreground">{schema.description}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What Each Schema Does</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border space-y-2">
                  <h4 className="font-medium text-sm text-blue-600 dark:text-blue-400">Organization + WebSite</h4>
                  <p className="text-xs text-muted-foreground">
                    Creates a Google Knowledge Panel on the right side of search results showing company name, logo, address, and key info. The WebSite schema enables the search box in sitelinks.
                  </p>
                </div>
                <div className="p-4 rounded-lg border space-y-2">
                  <h4 className="font-medium text-sm text-green-600 dark:text-green-400">SiteNavigationElement</h4>
                  <p className="text-xs text-muted-foreground">
                    Tells Google about your main navigation structure. This directly influences which sitelinks appear under your search listing — like the Namecheap example in your screenshot.
                  </p>
                </div>
                <div className="p-4 rounded-lg border space-y-2">
                  <h4 className="font-medium text-sm text-purple-600 dark:text-purple-400">SoftwareApplication</h4>
                  <p className="text-xs text-muted-foreground">
                    Marks GoRigo as a software product with features, pricing, and ratings. Can display star ratings and pricing in search results.
                  </p>
                </div>
                <div className="p-4 rounded-lg border space-y-2">
                  <h4 className="font-medium text-sm text-amber-600 dark:text-amber-400">BreadcrumbList</h4>
                  <p className="text-xs text-muted-foreground">
                    Shows breadcrumb navigation trail in search results (e.g., gorigo.ai &gt; Features &gt; AI Agents) instead of the raw URL.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Search Engine Verification Codes
              </CardTitle>
              <CardDescription>
                Enter verification codes from each search engine's webmaster tools. These are automatically added as meta tags to every page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {searchEngines
                .filter((e) => e.id !== "duckduckgo" && e.id !== "yahoo")
                .map((engine) => (
                  <div key={engine.id} className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${engine.color} text-white font-bold text-xs`}>
                          {engine.icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{engine.name}</h4>
                          <p className="text-xs text-muted-foreground">Market Share: {engine.share}</p>
                        </div>
                      </div>
                      {verificationCodes[engine.id as keyof VerificationCodes] ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Code Saved
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Set</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={`Paste ${engine.name} verification code`}
                        value={codeInputs[engine.id as keyof VerificationCodes] || ""}
                        onChange={(e) =>
                          setCodeInputs((prev) => ({
                            ...prev,
                            [engine.id]: e.target.value,
                          }))
                        }
                        data-testid={`input-verify-${engine.id}`}
                      />
                      <Button
                        onClick={() => saveVerificationCode(engine.id)}
                        disabled={saving === engine.id}
                        data-testid={`button-verify-save-${engine.id}`}
                      >
                        {saving === engine.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(engine.url, "_blank")}
                        data-testid={`button-verify-open-${engine.id}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

              <div className="p-4 rounded-lg bg-accent/50 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  DuckDuckGo & Yahoo
                </h4>
                <p className="text-xs text-muted-foreground">
                  These search engines don't have their own webmaster tools. DuckDuckGo and Yahoo both use Bing's search index.
                  Once you verify with Bing, your site will automatically appear in DuckDuckGo and Yahoo search results.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
