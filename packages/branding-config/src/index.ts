export type { BrandTheme, BrandColors, BrandAssets, BrandCopy } from "./types.js";
import { sahajTheme } from "./themes/default.theme.js";
import type { BrandTheme } from "./types.js";

/** All registered brand themes, keyed by brand id. Add white-label themes here. */
const THEME_REGISTRY: Record<string, BrandTheme> = {
  sahaj: sahajTheme,
};

const DEFAULT_BRAND_ID = "sahaj";

/**
 * Resolves the active brand theme for a given brand id (e.g. from
 * process.env.ACTIVE_BRAND on the server, or a runtime config endpoint on
 * the client). Falls back to the default brand if the id is unknown.
 */
export function resolveBrandTheme(brandId: string | undefined | null): BrandTheme {
  if (!brandId) return THEME_REGISTRY[DEFAULT_BRAND_ID]!;
  return THEME_REGISTRY[brandId] ?? THEME_REGISTRY[DEFAULT_BRAND_ID]!;
}

export function listAvailableBrands(): string[] {
  return Object.keys(THEME_REGISTRY);
}

export function registerBrandTheme(theme: BrandTheme): void {
  THEME_REGISTRY[theme.id] = theme;
}
