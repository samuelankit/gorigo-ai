"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";

interface ContactEntry {
  name: string;
  phone: string;
  email: string;
  company: string;
}

interface ManualEntryResult {
  created: number;
  duplicatesSkipped: number;
  errors: Array<{ index: number; reason: string }>;
  totalSubmitted: number;
}

interface ManualEntryProps {
  campaignId: number;
  orgId?: number;
  onComplete?: (result: ManualEntryResult) => void;
  onCancel?: () => void;
}

const emptyContact = (): ContactEntry => ({
  name: "",
  phone: "",
  email: "",
  company: "",
});

export function ManualEntry({ campaignId, orgId = 1, onComplete, onCancel }: ManualEntryProps) {
  const [contacts, setContacts] = useState<ContactEntry[]>([emptyContact()]);
  const [defaultCountry, setDefaultCountry] = useState("GB");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ManualEntryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addContact = () => {
    if (contacts.length >= 20) return;
    setContacts(prev => [...prev, emptyContact()]);
  };

  const removeContact = (index: number) => {
    if (contacts.length <= 1) return;
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof ContactEntry, value: string) => {
    setContacts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const filledContacts = contacts.filter(c => c.phone.trim());

  const handleSubmit = async () => {
    if (filledContacts.length === 0) {
      setError("Please enter at least one contact with a phone number.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/connectors/manual-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          orgId,
          defaultCountry,
          skipDuplicates,
          contacts: filledContacts,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add contacts.");
        return;
      }

      setResult(data);
      onComplete?.(data);
    } catch {
      setError("Failed to submit. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4" data-testid="manual-result">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          <h3 className="text-lg font-semibold">Contacts Added</h3>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-1">
              <span className="text-muted-foreground">Created</span>
              <Badge variant="default" data-testid="text-created-count">{result.created}</Badge>
            </div>
            {result.duplicatesSkipped > 0 && (
              <div className="flex justify-between items-center flex-wrap gap-1">
                <span className="text-muted-foreground">Duplicates Skipped</span>
                <Badge variant="secondary">{result.duplicatesSkipped}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {result.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {result.errors.map((e, i) => (
                <div key={i} className="text-sm">Contact {e.index + 1}: {e.reason}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={onCancel} className="w-full" data-testid="button-done">
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="manual-entry">
      <h3 className="text-lg font-semibold">Add Contacts Manually</h3>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="text-sm">Default Country</Label>
          <Select value={defaultCountry} onValueChange={setDefaultCountry}>
            <SelectTrigger className="w-[140px]" data-testid="select-country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GB">UK (+44)</SelectItem>
              <SelectItem value="US">US (+1)</SelectItem>
              <SelectItem value="AU">Australia (+61)</SelectItem>
              <SelectItem value="CA">Canada (+1)</SelectItem>
              <SelectItem value="IE">Ireland (+353)</SelectItem>
              <SelectItem value="DE">Germany (+49)</SelectItem>
              <SelectItem value="FR">France (+33)</SelectItem>
              <SelectItem value="IN">India (+91)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary" data-testid="text-contact-count">
          {filledContacts.length} of {contacts.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {contacts.map((contact, index) => (
          <Card key={index} className="relative" data-testid={`card-contact-${index}`}>
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground">Contact {index + 1}</span>
                {contacts.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeContact(index)}
                    data-testid={`button-remove-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor={`phone-${index}`} className="text-xs">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`phone-${index}`}
                    type="tel"
                    placeholder="07700 900123"
                    value={contact.phone}
                    onChange={(e) => updateContact(index, "phone", e.target.value)}
                    className="mt-1"
                    data-testid={`input-phone-${index}`}
                  />
                </div>
                <div>
                  <Label htmlFor={`name-${index}`} className="text-xs">Name</Label>
                  <Input
                    id={`name-${index}`}
                    placeholder="John Smith"
                    value={contact.name}
                    onChange={(e) => updateContact(index, "name", e.target.value)}
                    className="mt-1"
                    data-testid={`input-name-${index}`}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`email-${index}`} className="text-xs">Email</Label>
                    <Input
                      id={`email-${index}`}
                      type="email"
                      placeholder="john@example.com"
                      value={contact.email}
                      onChange={(e) => updateContact(index, "email", e.target.value)}
                      className="mt-1"
                      data-testid={`input-email-${index}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`company-${index}`} className="text-xs">Company</Label>
                    <Input
                      id={`company-${index}`}
                      placeholder="Acme Ltd"
                      value={contact.company}
                      onChange={(e) => updateContact(index, "company", e.target.value)}
                      className="mt-1"
                      data-testid={`input-company-${index}`}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {contacts.length < 20 && (
        <Button
          variant="outline"
          onClick={addContact}
          className="w-full"
          data-testid="button-add-another"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Contact
        </Button>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
            className="rounded"
            data-testid="checkbox-skip-duplicates"
          />
          <span className="text-sm">Skip recent duplicates</span>
        </label>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="sticky bottom-0 bg-background pt-2 pb-1 border-t flex gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1" data-testid="button-cancel">
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={filledContacts.length === 0 || submitting}
          className="flex-1"
          data-testid="button-submit"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Adding...
            </>
          ) : (
            `Add ${filledContacts.length} Contact${filledContacts.length !== 1 ? "s" : ""}`
          )}
        </Button>
      </div>
    </div>
  );
}
