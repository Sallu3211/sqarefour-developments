"use client";

import { useBranding } from "@/hooks/useBranding";
import { Logo } from "./Logo";

/** Shows the uploaded company logo (Settings > Branding) if one is set, else the placeholder monogram. */
export function BrandLogo({ size = 40, className }: { size?: number; className?: string }) {
  const { branding } = useBranding();

  if (branding.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={branding.logoUrl}
        alt={branding.companyName}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-xl object-cover ${className || ""}`}
      />
    );
  }

  return <Logo size={size} className={className} />;
}
