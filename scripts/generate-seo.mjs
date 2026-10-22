import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { routes, head, renderPage, verificationCodes } from "../.seo-build/entry-seo.js";

let shell = await readFile("dist/index.html", "utf8");
// Extra Search Console verification tags (src/core/analyticsConfig.ts or VITE_SEARCH_CONSOLE_VERIFICATION).
for (const code of verificationCodes()) {
  if (!shell.includes(`content="${code}"`)) shell = shell.replace("</head>", `<meta name="google-site-verification" content="${code}" /></head>`);
}
const cleanShell = shell
  .replace(/<title>[\s\S]*?<\/title>/i, "")
  .replace(/<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>/gi, "")
  .replace(/<link rel="(?:canonical|alternate)"[^>]*>/gi, "");
// Last commit date (YYYY-MM-DD) for sitemap <lastmod>; falls back to the build date.
let lastmod = new Date().toISOString().slice(0, 10);
try { lastmod = execSync("git log -1 --format=%cs", { encoding: "utf8" }).trim() || lastmod; } catch { /* no git history (e.g. shallow archive) */ }

for (const route of routes) {
  const target = route.path === "/" ? "dist/index.html" : path.join("dist", route.path.slice(1), "index.html");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, cleanShell
    .replace("</head>", `${head(route)}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${renderPage(route.path)}</div>`));
}

// Separate shells prevent private routes from inheriting homepage indexing tags.
for (const route of ["signin", "contact-inbox"]) {
  await mkdir(`dist/${route}`, { recursive: true });
  await writeFile(`dist/${route}/index.html`, cleanShell.replace("</head>", '<title>Uniquem | Private page</title><meta name="robots" content="noindex, nofollow"></head>'));
}
// Branded 404 page. Firebase Hosting serves dist/404.html with HTTP 404 for unknown URLs.
await writeFile("dist/404.html", cleanShell
  .replace("</head>", '<title>Page not found | Uniquem</title><meta name="robots" content="noindex, follow"></head>')
  .replace('<div id="root"></div>', `<div id="root">${renderPage("/404", true)}</div>`));
await writeFile("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `  <url><loc>https://uniquem.ca${route.path}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}\n</urlset>\n`);
await rm(".seo-build", { recursive: true, force: true });
console.log(`Generated complete public HTML for ${routes.length} routes and noindex shells for private routes.`);
