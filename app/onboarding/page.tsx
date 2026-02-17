"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Check, Headphones,
  Cloud, Key, Server, Shield, Zap, Phone, Bot, Globe, Lock, MessageSquare,
} from "lucide-react";

type DeploymentModel = "managed" | "byok" | "self_hosted" | "custom";

interface FaqEntry {
  question: string;
  answer: string;
}

const PACKAGES: {
  id: DeploymentModel;
  name: string;
  tagline: string;
  price: string;
  priceUnit: string;
  icon: typeof Cloud;
  color: string;
  bgColor: string;
  borderColor: string;
  popular?: boolean;
  features: string[];
  included: string[];
  notIncluded?: string[];
}[] = [
  {
    id: "managed",
    name: "Managed",
    tagline: "We handle everything",
    price: "\u00A30.15",
    priceUnit: "/min",
    icon: Cloud,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    popular: true,
    features: [
      "AI + Telephony costs included",
      "No API keys needed",
      "Automatic scaling",
      "24/7 platform monitoring",
    ],
    included: ["AI Models", "Telephony", "Platform", "Support"],
  },
  {
    id: "byok",
    name: "Bring Your Own Keys",
    tagline: "Use your own API credentials",
    price: "\u00A30.05",
    priceUnit: "/min",
    icon: Key,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    features: [
      "Platform fee only",
      "Your OpenAI + Twilio keys",
      "Full cost control",
      "Custom model selection",
    ],
    included: ["Platform"],
    notIncluded: ["AI Models", "Telephony"],
  },
  {
    id: "self_hosted",
    name: "Self-Hosted",
    tagline: "Run on your infrastructure",
    price: "\u00A30.03",
    priceUnit: "/min",
    icon: Server,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    features: [
      "Licence fee only",
      "Your infrastructure",
      "Full data sovereignty",
      "Enterprise compliance",
    ],
    included: ["Licence"],
    notIncluded: ["AI Models", "Telephony", "Hosting"],
  },
  {
    id: "custom",
    name: "Custom Plan",
    tagline: "Tailored to your needs",
    price: "Custom",
    priceUnit: "",
    icon: MessageSquare,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    features: [
      "Pick and choose features",
      "Custom billing rates",
      "Dedicated onboarding",
      "Bespoke SLAs",
    ],
    included: ["Negotiated"],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedPackage, setSelectedPackage] = useState<DeploymentModel>("managed");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [handoffNumber, setHandoffNumber] = useState("");

  const [agentName, setAgentName] = useState("AI Assistant");
  const [greeting, setGreeting] = useState("Hello, thank you for calling. How can I help you today?");
  const [inboundEnabled, setInboundEnabled] = useState(true);
  const [outboundEnabled, setOutboundEnabled] = useState(false);
  const [roles, setRoles] = useState("receptionist");

  const [faqEntries, setFaqEntries] = useState<FaqEntry[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const [selectedCountries, setSelectedCountries] = useState<string[]>(["GB"]);
  const [availableCountries, setAvailableCountries] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setBusinessName(data.user.businessName || "");
          if (data.org?.deploymentModel) {
            setSelectedPackage(data.org.deploymentModel as DeploymentModel);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });

    fetch("/api/countries")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailableCountries(data.map((c: { isoCode?: string; code?: string; name: string }) => ({
            code: c.isoCode || c.code || "",
            name: c.name,
          })));
        }
      })
      .catch((error) => { console.error("Fetch available countries failed:", error); });
  }, [router]);

  const addFaqEntry = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    if (faqEntries.length >= 10) return;
    setFaqEntries([...faqEntries, { question: newQuestion.trim(), answer: newAnswer.trim() }]);
    setNewQuestion("");
    setNewAnswer("");
  };

  const removeFaqEntry = (index: number) => {
    setFaqEntries(faqEntries.filter((_, i) => i !== index));
  };

  const handleLaunch = async () => {
    setSaving(true);
    try {
      const deployRes = await fetch("/api/onboarding/deployment-model", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentModel: selectedPackage }),
      });
      if (!deployRes.ok) {
        throw new Error("Failed to save deployment model");
      }

      if (businessName.trim()) {
        const profileRes = await fetch("/api/settings/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessName: businessName.trim() }),
        });
        if (!profileRes.ok) {
          throw new Error("Failed to save business name");
        }
      }

      const res = await fetch("/api/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          greeting,
          businessDescription: industry ? `Industry: ${industry}` : "",
          inboundEnabled,
          outboundEnabled,
          roles,
          faqEntries,
          handoffNumber,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save agent configuration");
      }

      if (selectedCountries.length > 0) {
        await fetch("/api/onboarding/international", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ countries: selectedCountries }),
        }).catch((error) => { console.error("Save international countries failed:", error); });
      }

      toast({ title: "Agent launched successfully", description: "Your AI agent is ready to go." });
      router.push("/dashboard");
    } catch (error) {
      toast({ title: "Error", description: "Failed to save configuration. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground" data-testid="text-loading">Loading...</div>
      </div>
    );
  }

  const totalSteps = 5;
  const stepLabels = ["Package", "Business", "Agent", "FAQ", "Countries"];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-500/5 via-background to-violet-500/5 p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-3">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500">
              <Headphones className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              <span className="text-primary font-bold">Go</span>
              <span className="text-accent font-bold">Rigo</span>
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-onboarding-title">
            {step === 1 ? "Choose Your Package" : step === 5 ? "International Calling" : "Set Up Your AI Agent"}
          </h1>
          <p className="text-muted-foreground">Step {step} of {totalSteps}</p>
        </div>

        <div className="flex items-center justify-center">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full text-sm font-medium transition-colors h-9 w-9",
                    s < step
                      ? "bg-primary text-primary-foreground"
                      : s === step
                        ? "border-2 border-primary text-primary bg-transparent"
                        : "bg-muted text-muted-foreground"
                  )}
                  data-testid={`step-indicator-${s}`}
                >
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  s === step ? "text-primary" : s < step ? "text-foreground" : "text-muted-foreground"
                )}>
                  {stepLabels[i]}
                </span>
              </div>
              {i < totalSteps - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-8 mx-1 mb-5 rounded-full transition-colors",
                    s < step ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PACKAGES.map((pkg) => {
                const Icon = pkg.icon;
                const isSelected = selectedPackage === pkg.id;
                return (
                  <Card
                    key={pkg.id}
                    className={cn(
                      "relative cursor-pointer transition-all",
                      isSelected
                        ? `ring-2 ring-primary ${pkg.borderColor}`
                        : "hover-elevate"
                    )}
                    onClick={() => setSelectedPackage(pkg.id)}
                    data-testid={`card-package-${pkg.id}`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <Badge variant="default" className="no-default-hover-elevate text-xs">
                          Recommended
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-2 pt-5">
                      <div className="flex items-center gap-2">
                        <div className={cn("flex items-center justify-center w-9 h-9 rounded-lg shrink-0", pkg.bgColor)}>
                          <Icon className={cn("w-5 h-5", pkg.color)} />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm">{pkg.name}</CardTitle>
                          <CardDescription className="text-xs">{pkg.tagline}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-bold text-foreground">{pkg.price}</span>
                        <span className="text-sm text-muted-foreground">{pkg.priceUnit}</span>
                      </div>

                      <Separator />

                      <div className="space-y-1.5">
                        {pkg.features.map((feature) => (
                          <div key={feature} className="flex items-start gap-2 text-xs">
                            <Check className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", pkg.color)} />
                            <span className="text-muted-foreground">{feature}</span>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Included:</p>
                        <div className="flex flex-wrap gap-1">
                          {pkg.included.map((item) => (
                            <Badge key={item} variant="secondary" className="no-default-hover-elevate text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center justify-center pt-1">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
                            <Check className="h-3.5 w-3.5 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {selectedPackage === "byok" && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="flex items-start gap-3 p-4">
                  <Key className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">API Keys Required</p>
                    <p className="text-muted-foreground mt-0.5">
                      After setup, you will need to configure your OpenAI API key and Twilio credentials in Settings &gt; Integrations.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedPackage === "self_hosted" && (
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="flex items-start gap-3 p-4">
                  <Server className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Infrastructure Required</p>
                    <p className="text-muted-foreground mt-0.5">
                      Self-hosted requires your own server infrastructure. You will receive deployment documentation and a licence key after setup.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedPackage === "custom" && (
              <Card className="border-violet-500/20 bg-violet-500/5">
                <CardContent className="flex items-start gap-3 p-4">
                  <MessageSquare className="h-5 w-5 text-violet-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Custom Plan</p>
                    <p className="text-muted-foreground mt-0.5">
                      Our sales team will work with you to configure a bespoke package. After completing this setup, a member of our team will contact you to finalise your custom rates and features.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === 2 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Tell us about your business so we can customize your AI agent.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your business name"
                  data-testid="input-business-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger data-testid="select-industry">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="real-estate">Real Estate</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="handoffNumber">Phone Number for Human Handoff</Label>
                <Input
                  id="handoffNumber"
                  value={handoffNumber}
                  onChange={(e) => setHandoffNumber(e.target.value)}
                  placeholder="+44 7700 900000"
                  data-testid="input-handoff-number"
                />
                <p className="text-xs text-muted-foreground">Calls will be transferred to this number when human assistance is needed.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>AI Agent Setup</CardTitle>
              <CardDescription>Configure how your AI agent interacts with callers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Agent Name</Label>
                <Input
                  id="agentName"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="AI Assistant"
                  data-testid="input-agent-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="greeting">Greeting Message</Label>
                <Textarea
                  id="greeting"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="Hello, thank you for calling..."
                  rows={3}
                  data-testid="textarea-greeting"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <Label>Inbound Calls</Label>
                  <p className="text-xs text-muted-foreground">Allow AI to handle incoming calls</p>
                </div>
                <Switch
                  checked={inboundEnabled}
                  onCheckedChange={setInboundEnabled}
                  data-testid="switch-inbound"
                />
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <Label>Outbound Calls</Label>
                  <p className="text-xs text-muted-foreground">Allow AI to make outgoing calls</p>
                </div>
                <Switch
                  checked={outboundEnabled}
                  onCheckedChange={setOutboundEnabled}
                  data-testid="switch-outbound"
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="roles">Agent Role</Label>
                <Select value={roles} onValueChange={setRoles}>
                  <SelectTrigger data-testid="select-roles">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>FAQ Setup</CardTitle>
              <CardDescription>Add common questions and answers your AI agent should know. You can add up to 10 entries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqEntries.length > 0 && (
                <div className="space-y-3">
                  {faqEntries.map((entry, index) => (
                    <div key={index} className="flex items-start gap-3 rounded-md border p-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium text-foreground" data-testid={`text-faq-question-${index}`}>{entry.question}</p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-faq-answer-${index}`}>{entry.answer}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFaqEntry(index)}
                        data-testid={`button-delete-faq-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {faqEntries.length < 10 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="newQuestion">Question</Label>
                      <Input
                        id="newQuestion"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="What are your business hours?"
                        data-testid="input-faq-question"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newAnswer">Answer</Label>
                      <Textarea
                        id="newAnswer"
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        placeholder="We are open Monday to Friday, 9 AM to 5 PM."
                        rows={2}
                        data-testid="textarea-faq-answer"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={addFaqEntry}
                      disabled={!newQuestion.trim() || !newAnswer.trim()}
                      data-testid="button-add-faq"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Entry
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>International Calling Countries</CardTitle>
              <CardDescription>Select which countries your AI agents will handle calls for. You can change this later in settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableCountries.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading available countries...</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {availableCountries.map((country) => {
                    const isSelected = selectedCountries.includes(country.code);
                    return (
                      <div
                        key={country.code}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all",
                          isSelected ? "ring-2 ring-primary border-primary/30 bg-primary/5" : "hover-elevate"
                        )}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCountries(selectedCountries.filter((c) => c !== country.code));
                          } else {
                            setSelectedCountries([...selectedCountries, country.code]);
                          }
                        }}
                        data-testid={`country-toggle-${country.code}`}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{country.name}</p>
                          <p className="text-xs text-muted-foreground">{country.code}</p>
                        </div>
                        {isSelected && (
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary shrink-0">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedCountries.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">{selectedCountries.length} {selectedCountries.length === 1 ? "country" : "countries"} selected</span>
                  <div className="flex gap-1 flex-wrap">
                    {selectedCountries.map((code) => (
                      <Badge key={code} variant="secondary" className="text-xs no-default-hover-elevate">{code}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Per-country compliance included</p>
                    <p className="text-muted-foreground mt-0.5">
                      Each country includes automatic calling hours enforcement, DNC list checking, AI disclosure in the local language, and recording consent management.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} data-testid="button-back">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {step === totalSteps && (
              <Button variant="ghost" onClick={handleLaunch} disabled={saving} data-testid="button-skip">
                Skip for now
              </Button>
            )}
            {step < totalSteps ? (
              <Button onClick={() => setStep(step + 1)} data-testid="button-next">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleLaunch} disabled={saving} data-testid="button-launch">
                {saving ? "Launching..." : "Launch My Agent"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
