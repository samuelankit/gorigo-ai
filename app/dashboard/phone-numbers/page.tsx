"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/use-toast";
import { Phone, Search, ShoppingCart, Loader2, Globe, MapPin } from "lucide-react";

interface AvailableNumber {
  phoneNumber: string;
  nationalFormat: string;
  type: string;
  country: string;
  region: string;
  monthlyCost: string;
  currency: string;
}

export default function PhoneNumbersPage() {
  const { toast } = useToast();
  const [country, setCountry] = useState("GB");
  const [numberType, setNumberType] = useState("local");
  const [areaCode, setAreaCode] = useState("");
  const [numbers, setNumbers] = useState<AvailableNumber[]>([]);
  const [searching, setSearching] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const searchNumbers = async () => {
    setSearching(true);
    try {
      const params = new URLSearchParams({ country, type: numberType });
      if (areaCode) params.set("areaCode", areaCode);
      const res = await fetch(`/api/phone-numbers/available?${params}`);
      const data = await res.json();
      setNumbers(data.numbers || []);
      setConfigured(data.configured !== false);
      if (!data.configured) {
        toast({ title: "Not configured", description: data.message || "Telephony provider not available.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to search for numbers.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const purchaseNumber = async (phoneNumber: string) => {
    setPurchasing(phoneNumber);
    try {
      const res = await fetch("/api/phone-numbers/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Purchase failed", description: data.error || "Could not purchase this number.", variant: "destructive" });
        return;
      }
      toast({ title: "Number purchased", description: data.message });
      setNumbers((prev) => prev.filter((n) => n.phoneNumber !== phoneNumber));
    } catch {
      toast({ title: "Error", description: "Failed to purchase number.", variant: "destructive" });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Phone Numbers</h1>
        <p className="text-muted-foreground mt-1">Browse and purchase phone numbers for your AI agents.</p>
      </div>

      <Card data-testid="card-search">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Search Available Numbers</CardTitle>
          </div>
          <CardDescription>Find phone numbers by country and type. Setup cost: £2.00 per number.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-36">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger data-testid="select-country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-36">
              <Label>Type</Label>
              <Select value={numberType} onValueChange={setNumberType}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="toll_free">Toll Free</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 min-w-36">
              <Label>Area Code (optional)</Label>
              <Input
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                placeholder="e.g. 020"
                data-testid="input-area-code"
              />
            </div>
            <Button onClick={searchNumbers} disabled={searching} data-testid="button-search">
              {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {numbers.length > 0 && (
        <Card data-testid="card-results">
          <CardHeader>
            <CardTitle className="text-base">Available Numbers ({numbers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Number</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Region</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Monthly</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {numbers.map((num) => (
                    <tr key={num.phoneNumber} className="border-b last:border-0" data-testid={`row-number-${num.phoneNumber}`}>
                      <td className="py-3 px-4 font-mono font-medium">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {num.phoneNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs capitalize">{num.type.replace("_", " ")}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {num.region && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {num.region}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        £{Number(num.monthlyCost).toFixed(2)}/mo
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => purchaseNumber(num.phoneNumber)}
                          disabled={purchasing === num.phoneNumber}
                          data-testid={`button-purchase-${num.phoneNumber}`}
                        >
                          {purchasing === num.phoneNumber ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-3 w-3 mr-1" />
                          )}
                          Purchase
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!searching && numbers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Search for available phone numbers to get started.</p>
            <p className="text-xs text-muted-foreground mt-1">Select your country and number type, then click Search.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
