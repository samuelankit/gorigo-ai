"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Headphones, ArrowLeft, CheckCircle2, Lock } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex flex-col items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500">
              <Headphones className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Invalid Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Link href="/forgot-password">
              <Button className="w-full" data-testid="button-request-new-link">
                Request a new link
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="w-full" data-testid="link-back-to-login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="flex flex-col items-center gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500">
            <Headphones className="h-6 w-6 text-white" />
          </div>
          <Link href="/" className="text-2xl font-bold tracking-tight inline-block" data-testid="link-reset-logo">
            <span className="text-primary font-bold">Go</span>
            <span className="text-accent font-bold">Rigo</span>
          </Link>
        </div>
        <CardTitle className="text-2xl" data-testid="text-reset-title">
          {success ? "Password Reset" : "Set New Password"}
        </CardTitle>
        <CardDescription data-testid="text-reset-description">
          {success
            ? "Your password has been updated. Redirecting to sign in..."
            : "Enter your new password below."}
        </CardDescription>
      </CardHeader>

      {success ? (
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Redirecting you to sign in...
            </p>
          </div>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3" data-testid="text-reset-error">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password" data-testid="label-reset-password">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                data-testid="input-reset-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" data-testid="label-reset-confirm">
                Confirm Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                data-testid="input-reset-confirm"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="button-reset-submit"
            >
              <Lock className="w-4 h-4 mr-2" />
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
            <Link href="/login" className="w-full">
              <Button variant="ghost" className="w-full" data-testid="link-reset-back" type="button">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Button>
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500/5 via-background to-violet-500/5 px-4">
        <ResetPasswordForm />
      </div>
    </Suspense>
  );
}
