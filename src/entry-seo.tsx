import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import PublicSite from "./public/PublicSite";
export { routes, head } from "./public/seo";

// Render the same public components used by the interactive app, without auth.
export function renderPage(path: string) {
  return renderToString(<StaticRouter location={path}><PublicSite prerender /></StaticRouter>);
}
