/**
 * Centralized branding contract. Nothing in the API, web app, or adapters
 * is allowed to hardcode a product name, color, or logo — everything flows
 * through a BrandTheme resolved at runtime from ACTIVE_BRAND.
 */
export interface BrandColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
}

export interface BrandAssets {
  logoUrl: string;
  logoMarkUrl: string;
  faviconUrl: string;
}

export interface BrandCopy {
  productName: string;
  tagline: string;
  supportEmail: string;
}

export interface BrandTheme {
  id: string;
  colors: BrandColors;
  assets: BrandAssets;
  copy: BrandCopy;
  fontFamily: string;
}
