import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { resolveBrandTheme } from "@sahaj/branding-config";
import { applyBrandTheme } from "./theme/applyTheme";
import { App } from "./App";
import "./styles/global.css";

applyBrandTheme(resolveBrandTheme(import.meta.env.VITE_ACTIVE_BRAND));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
