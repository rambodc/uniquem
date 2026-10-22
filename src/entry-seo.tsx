import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import PublicSite from "./public/PublicSite";
import { SEARCH_CONSOLE_VERIFICATION_CODES } from "./core/analyticsConfig";
export { routes, head } from "./public/seo";

// Render the same public components used by the interactive app, without auth.
export function renderPage(path: string, notFound = false) {
  return renderToString(<StaticRouter location={path}><PublicSite prerender notFound={notFound} /></StaticRouter>);
}

/** Search Console verification codes from analyticsConfig.ts plus VITE_SEARCH_CONSOLE_VERIFICATION. */
export function verificationCodes(): string[] {
  const fromEnv = String(import.meta.env.VITE_SEARCH_CONSOLE_VERIFICATION || "").split(",");
  return [...new Set([...SEARCH_CONSOLE_VERIFICATION_CODES, ...fromEnv].map((code) => code.trim()).filter((code) => /^[\w-]{10,100}$/.test(code)))];
}
