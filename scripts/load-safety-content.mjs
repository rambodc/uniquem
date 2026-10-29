// Loads the Safety mini app's lessons from safety-content/ into production: Firestore (safetyCategories, safetyLessons)
// and Cloud Storage (safety/lessons/<lesson>/<file>). Safe to run again and again: documents are written whole,
// media is uploaded only when it changed, and categories or lessons removed from content.json are removed from Firestore
// (people's safetyProgress is never touched). Bump a lesson's "version" when its content changes so everyone retakes it.
//
// It runs by itself on GitHub (.github/workflows/safety-content.yml) whenever a change to safety-content/ is merged into production,
// and can be run by hand from the workflow's "Run workflow" button or locally:
//   node scripts/load-safety-content.mjs            (uses your Google Application Default Credentials)
//   node scripts/load-safety-content.mjs --check    (validates content.json and the media files, writes nothing)
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { contentToDocs } from "../functions/safety.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), ".."), dir = path.join(root, "safety-content");
const PROJECT = "uniquem-4366e", BUCKET = "uniquem-4366e.firebasestorage.app";
const TYPES = { svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", mp4: "video/mp4", webm: "video/webm", glb: "model/gltf-binary", mp3: "audio/mpeg", m4a: "audio/mp4" };
const content = JSON.parse(readFileSync(path.join(dir, "content.json"), "utf8"));
const docs = contentToDocs(content);
const files = docs.uploads.map((upload) => { const ext = upload.file.split(".").pop().toLowerCase(), type = TYPES[ext]; if (!type) throw new Error(`${upload.file}: unsupported file type`); const data = readFileSync(path.join(dir, "media", upload.file)); return { ...upload, type, data, md5: createHash("md5").update(data).digest("base64") }; });
console.log(`content.json is valid: ${docs.categories.length} categories, ${docs.lessons.length} lessons, ${files.length} media files (${Math.round(files.reduce((n, f) => n + f.data.length, 0) / 1024)} KB).`);
if (process.argv.includes("--check")) process.exit(0);

const require = createRequire(path.join(root, "functions", "package.json"));
const { initializeApp, applicationDefault } = require("firebase-admin/app"), { getFirestore } = require("firebase-admin/firestore"), { getStorage } = require("firebase-admin/storage");
initializeApp({ credential: applicationDefault(), projectId: PROJECT, storageBucket: BUCKET });
const db = getFirestore(), bucket = getStorage().bucket();

let uploaded = 0;
for (const file of files) {
  const ref = bucket.file(file.storagePath), [exists] = await ref.exists();
  if (exists && (await ref.getMetadata())[0].md5Hash === file.md5) continue;
  await ref.save(file.data, { contentType: file.type, resumable: false, metadata: { cacheControl: "private, max-age=3600" } });
  uploaded++;
}
const batch = db.batch(), keepCats = new Set(docs.categories.map((c) => c.id)), keepLessons = new Set(docs.lessons.map((l) => l.id));
for (const { id, doc } of docs.categories) batch.set(db.collection("safetyCategories").doc(id), doc);
for (const { id, doc } of docs.lessons) batch.set(db.collection("safetyLessons").doc(id), doc);
let removed = 0;
for (const doc of (await db.collection("safetyCategories").get()).docs) if (!keepCats.has(doc.id)) { batch.delete(doc.ref); removed++; }
for (const doc of (await db.collection("safetyLessons").get()).docs) if (!keepLessons.has(doc.id)) { batch.delete(doc.ref); removed++; }
await batch.commit();
const used = new Set(files.map((f) => f.storagePath));
const [existing] = await bucket.getFiles({ prefix: "safety/lessons/" });
let deleted = 0;
for (const file of existing) if (!used.has(file.name)) { await file.delete(); deleted++; }
console.log(`Loaded: ${docs.categories.length} categories and ${docs.lessons.length} lessons written, ${removed} removed; ${uploaded} media files uploaded, ${files.length - uploaded} unchanged, ${deleted} unused deleted.`);
