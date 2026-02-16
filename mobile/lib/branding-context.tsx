import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BrandingConfig, loadBranding, saveBranding, clearBranding } from "./api";

interface BrandingState {
  branding: BrandingConfig | null;
  partnerCode: string | null;
  isWhiteLabel: boolean;
  setBranding: (branding: BrandingConfig, partnerCode: string) => Promise<void>;
  resetBranding: () => Promise<void>;
}

const defaultBranding: BrandingConfig = {
  brandName: "GoRigo",
  brandLogo: null,
  brandColor: "#189553",
};

const BrandingContext = createContext<BrandingState>({
  branding: defaultBranding,
  partnerCode: null,
  isWhiteLabel: false,
  setBranding: async () => {},
  resetBranding: async () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBrandingState] = useState<BrandingConfig>(defaultBranding);
  const [partnerCode, setPartnerCode] = useState<string | null>(null);

  useEffect(() => {
    loadBranding().then((saved) => {
      if (saved) {
        setBrandingState({
          brandName: saved.brandName,
          brandLogo: saved.brandLogo,
          brandColor: saved.brandColor,
        });
        setPartnerCode(saved.partnerCode);
      }
    });
  }, []);

  const setBrandingHandler = useCallback(async (b: BrandingConfig, code: string) => {
    setBrandingState(b);
    setPartnerCode(code);
    await saveBranding({ ...b, partnerCode: code });
  }, []);

  const resetBranding = useCallback(async () => {
    setBrandingState(defaultBranding);
    setPartnerCode(null);
    await clearBranding();
  }, []);

  return (
    <BrandingContext.Provider
      value={{
        branding,
        partnerCode,
        isWhiteLabel: partnerCode !== null,
        setBranding: setBrandingHandler,
        resetBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
