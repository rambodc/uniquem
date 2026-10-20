import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { head, routes, seoSelectors } from "./seo";

export default function SeoMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const route = routes.find((page) => page.path === pathname);
    const template = document.createElement("template");
    template.innerHTML = route
      ? head(route)
      : '<title>Uniquem | Private page</title><meta name="robots" content="noindex, nofollow">';
    document.head.querySelectorAll(seoSelectors).forEach((node) => node.remove());
    document.head.append(template.content);
  }, [pathname]);
  return null;
}
