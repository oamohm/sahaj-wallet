import type { BrandTheme } from "@sahaj/branding-config";

/**
 * Applies a BrandTheme to the document as CSS custom properties. This is the
 * ONLY place brand colors/fonts touch the DOM — every component reads
 * `var(--brand-*)` instead of importing color literals, so swapping the
 * active brand (white-label) never requires touching component code.
 */
export function applyBrandTheme(theme: BrandTheme): void {
  const root = document.documentElement;
  const c = theme.colors;

  root.style.setProperty("--brand-primary", c.primary);
  root.style.setProperty("--brand-primary-fg", c.primaryForeground);
  root.style.setProperty("--brand-secondary", c.secondary);
  root.style.setProperty("--brand-accent", c.accent);
  root.style.setProperty("--brand-bg", c.background);
  root.style.setProperty("--brand-surface", c.surface);
  root.style.setProperty("--brand-text", c.textPrimary);
  root.style.setProperty("--brand-text-muted", c.textMuted);
  root.style.setProperty("--brand-success", c.success);
  root.style.setProperty("--brand-warning", c.warning);
  root.style.setProperty("--brand-danger", c.danger);
  root.style.setProperty("--brand-font", theme.fontFamily);

  document.title = theme.copy.productName;

  const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (favicon) {
    favicon.href = theme.assets.faviconUrl;
  } else {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = theme.assets.faviconUrl;
    document.head.appendChild(link);
  }
}
