import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { installChunkRecovery } from "./core/resilience";
import { isNativeApp } from "./native/platform";
import "./styles.css";
import "./brand-overrides.css";
import "./public/sandweb/sandweb.css";

installChunkRecovery();
const container = document.getElementById("root")!;
const app = <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>;
// Public pages arrive prerendered (scripts/generate-seo.mjs). Hydrating keeps that
// HTML (including the LCP image) instead of rebuilding it; private shells are empty.
// The iOS app opens every route from the bundled homepage HTML, so it always renders fresh instead of hydrating.
if (container.hasChildNodes() && !isNativeApp()) hydrateRoot(container, app, { onRecoverableError: () => undefined });
else { container.replaceChildren(); createRoot(container).render(app); }
