import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

// Run against build output, the Hosting emulator, or production after deployment.
const base = process.argv[2]?.replace(/\/$/, "");
const checkedAssets = new Set();
async function fetchStatus(url) {
  const response = await fetch(url);
  await response.body?.cancel();
  return response.status;
}
async function read(route) {
  if (base) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200, `${route}: HTTP status`);
    return { html: await response.text(), headers: response.headers };
  }
  const file = route === "/" ? "dist/index.html" : route === "/sitemap.xml" ? "dist/sitemap.xml" : `dist${route}/index.html`;
  return { html: await readFile(file, "utf8"), headers: null };
}
const sitemap = new JSDOM((await read("/sitemap.xml")).html, { contentType: "text/xml" }).window.document;
const urls = [...sitemap.querySelectorAll("loc")].map((node) => node.textContent);
assert.equal(urls.length, 21, "public sitemap count");
assert.equal(new Set(urls).size, urls.length, "duplicate sitemap URLs");
for (const url of urls) {
  const pathname = new URL(url).pathname;
  const { html, headers } = await read(pathname);
  const doc = new JSDOM(html).window.document;
  assert.equal(doc.querySelectorAll("h1").length, 1, `${pathname}: heading`);
  assert.equal(doc.querySelectorAll('link[rel="canonical"]').length, 1, `${pathname}: single canonical`);
  assert.equal(doc.querySelector('link[rel="canonical"]').getAttribute("href"), url, `${pathname}: canonical`);
  assert.match(doc.querySelector('meta[name="robots"]').content, /^index, follow/, `${pathname}: indexing allowed`);
  assert.ok(!headers?.get("x-robots-tag")?.includes("noindex"), `${pathname}: public header`);
  assert.ok(doc.querySelector('meta[name="google-site-verification"]'), `${pathname}: verification preserved`);
  assert.ok(doc.querySelector('a[href="/contact-us"]'), `${pathname}: real navigation`);
  assert.ok(doc.querySelector("main").textContent.length > 350, `${pathname}: complete content`);
  JSON.parse(doc.querySelector("script[data-seo-jsonld]").textContent);
  for (const asset of doc.querySelectorAll('script[src], link[rel="stylesheet"]')) {
    const source = asset.getAttribute("src") || asset.getAttribute("href");
    if (base) {
      if (!checkedAssets.has(source)) {
        assert.equal(await fetchStatus(`${base}${source}`), 200, `${pathname}: asset ${source}`);
        checkedAssets.add(source);
      }
    } else await readFile(`dist${source}`);
  }
  if (pathname === "/chemicals") {
    for (const product of urls.filter((item) => new URL(item).pathname.startsWith("/chemicals/"))) {
      assert.ok(doc.querySelector(`a[href="${new URL(product).pathname}"]`), `catalogue links to ${product}`);
    }
  }
}
for (const pathname of ["/signin", "/contact-inbox"]) {
  const { html, headers } = await read(pathname);
  const doc = new JSDOM(html).window.document;
  assert.equal(doc.querySelector('meta[name="robots"]').content, "noindex, nofollow");
  assert.equal(doc.querySelector('link[rel="canonical"]'), null);
  assert.equal(doc.querySelector("script[data-seo-jsonld]"), null);
  if (base) assert.match(headers.get("x-robots-tag"), /noindex/);
}
const config = JSON.parse(await readFile("firebase.json", "utf8"));
for (const redirect of config.hosting.redirects) {
  assert.ok(urls.includes(`https://uniquem.ca${redirect.destination}`), `${redirect.source}: relevant live target`);
  if (base) {
    const response = await fetch(`${base}${redirect.source}`, { redirect: "manual" });
    await response.body?.cancel();
    assert.equal(response.status, 301, `${redirect.source}: permanent redirect`);
    assert.equal(new URL(response.headers.get("location"), base).pathname, redirect.destination, `${redirect.source}: destination`);
  }
}
if (base) assert.equal(await fetchStatus(`${base}/does-not-exist-seo-check`), 404, "unknown URLs stay 404");
console.log(`SEO checks passed: ${urls.length} public pages, 2 private pages, ${config.hosting.redirects.length} legacy redirects${base ? ` at ${base}` : " in build output"}.`);
