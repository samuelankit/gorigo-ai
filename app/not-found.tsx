import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="flex items-center justify-center min-h-[60vh] p-6"
      data-testid="not-found-page"
    >
      <Card className="max-w-md w-full p-6 text-center space-y-4">
        <div className="flex justify-center">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex justify-center">
          <Link href="/">
            <Button data-testid="button-go-home">Go Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
