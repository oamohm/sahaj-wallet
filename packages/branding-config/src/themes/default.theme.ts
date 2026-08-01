import type { BrandTheme } from "../types.js";

/**
 * Default "sahaj" theme. Additional themes (white-label partners) live
 * alongside this file and are registered in the theme registry below —
 * never inline in app code.
 */
export const sahajTheme: BrandTheme = {
  id: "sahaj",
  colors: {
    primary: "#5B4FE8",
    primaryForeground: "#FFFFFF",
    secondary: "#00C2A8",
    accent: "#FFB84C",
    background: "#0B0B12",
    surface: "#15151F",
    textPrimary: "#F5F5FA",
    textMuted: "#9A9AB0",
    success: "#3DDC84",
    warning: "#FFC145",
    danger: "#FF5C5C",
  },
  assets: {
    logoUrl: "/branding/sahaj/logo.svg",
    logoMarkUrl: "/branding/sahaj/mark.svg",
    faviconUrl: "/branding/sahaj/favicon.ico",
  },
  copy: {
    productName: "Sahaj Wallet",
    tagline: "One wallet, every network.",
    supportEmail: "support@sahaj.app",
  },
  fontFamily: "'Inter', system-ui, sans-serif",
};
