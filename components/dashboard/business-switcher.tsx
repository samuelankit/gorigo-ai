"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, Check, Plus } from "lucide-react";

interface Business {
  id: number;
  name: string;
  role: string;
  deploymentModel: string;
  isActive: boolean;
}

interface BusinessSwitcherProps {
  businesses: Business[];
  currentBusinessName: string;
  onSwitch: (businessId: number) => void;
}

export function BusinessSwitcher({ businesses, currentBusinessName, onSwitch }: BusinessSwitcherProps) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const handleSwitch = async (businessId: number) => {
    if (switching) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/businesses/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      if (res.ok) {
        onSwitch(businessId);
        router.refresh();
        window.location.reload();
      }
    } catch {} finally {
      setSwitching(false);
    }
  };

  if (businesses.length <= 1) {
    return (
      <div className="flex items-center gap-1.5 text-sm" data-testid="text-business-name">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium truncate max-w-[140px]">{currentBusinessName}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-business-switcher">
          <Building2 className="h-3.5 w-3.5" />
          <span className="truncate max-w-[140px]">{currentBusinessName}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64" data-testid="menu-business-switcher">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Your Businesses
        </DropdownMenuLabel>
        {businesses.map((biz) => (
          <DropdownMenuItem
            key={biz.id}
            onClick={() => !biz.isActive && handleSwitch(biz.id)}
            className="gap-2"
            data-testid={`menu-item-business-${biz.id}`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{biz.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{biz.deploymentModel}</p>
            </div>
            {biz.isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/dashboard/businesses/new")}
          className="gap-2"
          data-testid="menu-item-add-business"
        >
          <Plus className="h-4 w-4" />
          Add New Business
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
