import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "./analytics";

/** Starts GA4 on the first public page and keeps it switched off on private pages.
 * Render after <SeoMetadata /> so document.title already belongs to the new page. */
export default function AnalyticsTracker() {
  const { pathname } = useLocation();
  useEffect(() => { trackPageView(pathname); }, [pathname]);
  return null;
}
