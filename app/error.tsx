"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error]", error.message, error.digest);
  }, [error]);

  return (
    <div
      className="flex items-center justify-center min-h-[60vh] p-6"
      data-testid="error-page"
    >
      <Card className="max-w-md w-full p-6 text-center space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => reset()} data-testid="button-error-retry">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    </div>
  );
}
