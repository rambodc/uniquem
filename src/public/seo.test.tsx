// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Link, MemoryRouter } from "react-router-dom";
import { renderPage } from "../entry-seo";
import { publicProducts } from "./products";
import { head, jsonLd, routes } from "./seo";
import SeoMetadata from "./SeoMetadata";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

describe("public SEO", () => {
  it("renders full public content and catalogue discovery without JavaScript", () => {
    const catalogue = document.createElement("div");
    catalogue.innerHTML = renderPage("/chemicals");
    expect(routes).toHaveLength(publicProducts.length + 5);
    const cards = [...catalogue.querySelectorAll(".catalogue-card a")].map((node) => node.getAttribute("href"));
    expect(cards[cards.indexOf("/chemicals/kaolok") + 1]).toBe("/chemicals/sandweb");
    for (const product of publicProducts) {
      expect(catalogue.querySelector(`a[href="${product.path}"]`)).not.toBeNull();
      const page = document.createElement("div");
      page.innerHTML = renderPage(product.path);
      expect(page.textContent).toContain(product.description);
      expect(page.textContent).toContain(product.packaging);
      expect(page.querySelectorAll("h1")).toHaveLength(1);
      const route = routes.find((item) => item.path === product.path)!;
      const graph = JSON.parse(jsonLd(route))["@graph"];
      // No schema.org/Product: there are no prices or reviews, so a Product item
      // would be flagged as an invalid product snippet by Search Console.
      expect(JSON.stringify(graph)).not.toMatch(/"@type":"(Product|Offer|AggregateRating|Review)"/);
      const itemPage = graph.find((item: { "@type": string }) => item["@type"] === "ItemPage");
      const substance = graph.find((item: { "@type": string }) => item["@type"] === "ChemicalSubstance");
      expect(substance.name).toBe(product.name);
      expect(itemPage.mainEntity["@id"]).toBe(substance["@id"]);
      const crumbs = graph.find((item: { "@type": string }) => item["@type"] === "BreadcrumbList").itemListElement;
      expect(crumbs.map((item: { name: string }) => item.name)).toEqual(["Home", "Chemicals", product.name]);
    }
    for (const route of routes) {
      const page = document.createElement("div");
      page.innerHTML = renderPage(route.path);
      expect(page.querySelector('a[href="/contact-us"]')).not.toBeNull();
      expect(page.querySelectorAll("h1")).toHaveLength(1);
    }
    expect(renderPage("/about-us")).toContain("custom chemical formulation and blending");
    const sandweb = document.createElement("div");
    sandweb.innerHTML = renderPage("/chemicals/sandweb");
    expect(sandweb.querySelector("h1")?.textContent).toContain("sand consolidation chemistry");
    expect(sandweb.textContent).toContain("SandWeb vs resin-coated sand");
    expect(sandweb.textContent).toContain("Example figures, for illustration only");
    expect(sandweb.querySelector('a[href="/contact-us"]')).not.toBeNull();
    const sandwebRoute = routes.find((item) => item.path === "/chemicals/sandweb")!;
    const faqPage = JSON.parse(jsonLd(sandwebRoute))["@graph"].find((item: { "@type": string }) => item["@type"] === "FAQPage");
    expect(faqPage.mainEntity.length).toBeGreaterThan(3);
    for (const question of faqPage.mainEntity) expect(sandweb.textContent).toContain(question.acceptedAnswer.text);
    expect(renderPage("/")).toContain("Environmental responsibility");
  });

  it("updates metadata across client navigation and removes public tags on private routes", async () => {
    const node = document.createElement("div");
    document.body.append(node);
    document.head.innerHTML = head(routes[0]) + '<meta name="google-site-verification" content="preserved">';
    root = createRoot(node);
    await act(async () => root!.render(<MemoryRouter><SeoMetadata /><Link to="/chemicals/elixir">Product</Link><Link to="/chemicals/sandweb">SandWeb</Link><Link to="/contact-us">Contact</Link><Link to="/signin">Private</Link><Link to="/">Home</Link></MemoryRouter>));
    for (const pathname of ["/chemicals/elixir", "/chemicals/sandweb", "/contact-us", "/signin", "/"]) {
      const anchor = node.querySelector(`a[href="${pathname}"]`)!;
      await act(async () => anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })));
      const route = routes.find((item) => item.path === pathname);
      expect(document.head.querySelectorAll("title")).toHaveLength(1);
      expect(document.querySelector('meta[name="google-site-verification"]')?.getAttribute("content")).toBe("preserved");
      if (route) {
        expect(document.title).toBe(route.title);
        expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`https://uniquem.ca${pathname}`);
        expect(document.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe(`https://uniquem.ca${pathname}`);
        expect(document.querySelectorAll("script[data-seo-jsonld]")).toHaveLength(1);
      } else {
        expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
        expect(document.querySelector('link[rel="canonical"]')).toBeNull();
        expect(document.querySelector("script[data-seo-jsonld]")).toBeNull();
      }
    }
  });
});
