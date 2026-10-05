import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { routes, head, renderPage } from "../.seo-build/entry-seo.js";

const shell = await readFile("dist/index.html", "utf8");
const cleanShell = shell
  .replace(/<title>[\s\S]*?<\/title>/i, "")
  .replace(/<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>/gi, "")
  .replace(/<link rel="canonical"[^>]*>/gi, "");

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
await writeFile("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `  <url><loc>https://uniquem.ca${route.path}</loc></url>`).join("\n")}\n</urlset>\n`);
await rm(".seo-build", { recursive: true, force: true });
console.log(`Generated complete public HTML for ${routes.length} routes and noindex shells for private routes.`);
