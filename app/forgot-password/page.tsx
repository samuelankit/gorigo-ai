"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Headphones, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setSent(true);
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500/5 via-background to-violet-500/5 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex flex-col items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500">
              <Headphones className="h-6 w-6 text-white" />
            </div>
            <Link href="/" className="text-2xl font-bold tracking-tight inline-block" data-testid="link-forgot-logo">
              <span className="text-primary font-bold">Go</span>
              <span className="text-accent font-bold">Rigo</span>
            </Link>
          </div>
          <CardTitle className="text-2xl" data-testid="text-forgot-title">
            {sent ? "Check your email" : "Reset your password"}
          </CardTitle>
          <CardDescription data-testid="text-forgot-description">
            {sent
              ? "If an account exists with that email, we've generated a reset link."
              : "Enter your email address and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>

        {sent ? (
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Check your email inbox. The reset link will expire in 1 hour.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                data-testid="button-try-again"
              >
                <Mail className="w-4 h-4 mr-2" />
                Try a different email
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full" data-testid="link-back-to-login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to sign in
                </Button>
              </Link>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3" data-testid="text-forgot-error">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" data-testid="label-forgot-email">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-forgot-email"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="button-forgot-submit"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <Link href="/login" className="w-full">
                <Button variant="ghost" className="w-full" data-testid="link-forgot-back" type="button">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to sign in
                </Button>
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
