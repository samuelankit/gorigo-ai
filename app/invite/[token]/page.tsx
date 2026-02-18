"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle2, XCircle, Shield } from "lucide-react";

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params.token as string;

  const [businessName, setBusinessName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"form" | "success" | "error">("form");
  const [errorMessage, setErrorMessage] = useState("");

  const passwordsMatch = password === confirmPassword;
  const passwordValid = password.length >= 8;
  const formValid = businessName.trim().length > 0 && passwordValid && passwordsMatch;

  const handleAccept = async () => {
    if (!formValid) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          businessName: businessName.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Failed to accept invitation");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="w-8 h-8 text-[#E8604C]" />
              <span className="text-2xl font-bold text-foreground">GoRigo</span>
            </div>

            {status === "success" ? (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-foreground">Welcome aboard!</h2>
                <p className="text-sm text-muted-foreground" data-testid="text-invite-status">
                  Your account has been created successfully. You can now log in.
                </p>
                <Link href="/login">
                  <Button className="w-full mt-4" style={{ backgroundColor: "#189553" }} data-testid="link-go-to-login">
                    Go to Login
                  </Button>
                </Link>
              </div>
            ) : status === "error" ? (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-foreground">Invitation Error</h2>
                <p className="text-sm text-muted-foreground" data-testid="text-invite-status">
                  {errorMessage}
                </p>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => { setStatus("form"); setErrorMessage(""); }}
                  data-testid="button-try-again"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 mx-auto mb-2">
                  <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  You&apos;ve been invited!
                </h2>
                <p className="text-sm text-muted-foreground" data-testid="text-invite-status">
                  Create your account to join the organization.
                </p>
              </>
            )}
          </div>

          {status === "form" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Full Name *</Label>
                <Input
                  id="invite-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your full name"
                  data-testid="input-invite-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-password">Password *</Label>
                <Input
                  id="invite-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  data-testid="input-invite-password"
                />
                {password.length > 0 && !passwordValid && (
                  <p className="text-xs text-red-500">Password must be at least 8 characters</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-confirm-password">Confirm Password *</Label>
                <Input
                  id="invite-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  data-testid="input-invite-confirm-password"
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>
              <Button
                className="w-full"
                style={{ backgroundColor: "#E8604C" }}
                onClick={handleAccept}
                disabled={submitting || !formValid}
                data-testid="button-accept-invite"
              >
                {submitting ? "Creating Account..." : "Accept Invitation"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
