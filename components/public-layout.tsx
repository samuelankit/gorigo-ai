"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/theme-provider";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { setForceLightMode } = useTheme();

  useEffect(() => {
    setForceLightMode(true);
    return () => {
      setForceLightMode(false);
    };
  }, [setForceLightMode]);

  return <>{children}</>;
}
