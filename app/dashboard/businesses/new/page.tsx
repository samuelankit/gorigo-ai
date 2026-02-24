"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, Check, Loader2 } from "lucide-react";

const allDeploymentOptions = [
  {
    value: "individual",
    key: "individual" as const,
    title: "Individual",
    description: "We run everything. You focus on your business.",
    rate: "From 20p/min",
  },
  {
    value: "self-hosted",
    key: "selfHosted" as const,
    title: "Self-Hosted",
    description: "Deploy on your own infrastructure with full control.",
    rate: "From 8p/min",
  },
];

export default function NewBusinessPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [deploymentModel, setDeploymentModel] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [deploymentOptions, setDeploymentOptions] = useState(allDeploymentOptions);

  useEffect(() => {
    fetch("/api/public/deployment-packages")
      .then((r) => r.json())
      .then((data: Record<string, boolean>) => {
        const filtered = allDeploymentOptions.filter((opt) => data[opt.key]);
        setDeploymentOptions(filtered);
        if (filtered.length > 0 && !filtered.some((f) => f.value === deploymentModel)) {
          setDeploymentModel(filtered[0].value);
        }
      })
      .catch(() => {
        setDeploymentOptions(allDeploymentOptions);
        if (!deploymentModel) setDeploymentModel("individual");
      });
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter a business name");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), deploymentModel }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create business");
        return;
      }
      window.location.href = "/dashboard";
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto" data-testid="page-new-business">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-6"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Add New Business
        </h1>
        <p className="text-muted-foreground mt-1">
          Create a new business under your account. Each business gets its own agents, calls, wallet, and analytics.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="business-name">Business Name</Label>
          <Input
            id="business-name"
            placeholder="e.g. My Second Business"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="input-business-name"
          />
        </div>

        <div className="space-y-3">
          <Label>Deployment Package</Label>
          <div className="grid gap-3">
            {deploymentOptions.map((option) => (
              <Card
                key={option.value}
                className={`cursor-pointer transition-colors ${
                  deploymentModel === option.value
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => setDeploymentModel(option.value)}
                data-testid={`card-deployment-${option.value}`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      deploymentModel === option.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {deploymentModel === option.value && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{option.title}</p>
                      <span className="text-xs text-muted-foreground">{option.rate}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" data-testid="text-error">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleCreate}
            disabled={creating}
            data-testid="button-create-business"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4 mr-2" />
            )}
            {creating ? "Creating..." : "Create Business"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
