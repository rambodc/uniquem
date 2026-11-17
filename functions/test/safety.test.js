import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { inflateSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { URL } from "node:url";
import { requireMiniApp } from "../core.js";
import { PDFDocument } from "pdf-lib";
import { SAFETY_PATHS, contentToDocs, gradeQuiz, nextProgress, progressStatus, progressView, publicLesson, resetProgress, safetyReport, validateLesson } from "../safety.js";
import { safetyReportPdf } from "../safety-report-pdf.js";

const content = JSON.parse(readFileSync(new URL("../../safety-content/content.json", import.meta.url), "utf8"));
const docs = contentToDocs(content);
const lesson = docs.lessons.find((l) => l.id === "welcome-to-uniquem").doc;

test("the sample content is valid: Uniquem Basics stays, Loading and Unloading is the other category", () => {
  assert.deepEqual(docs.categories.map((c) => c.doc.title), ["Uniquem Basics", "Loading and Unloading", "Forklift and Power Jack", "Chemical Production"]);
  assert.deepEqual(docs.lessons.map((l) => l.id), ["welcome-to-uniquem", "loading-and-unloading", "forklift-and-power-jack-safety", "chemical-production-safety"]);
  const loading = docs.lessons.find((l) => l.id === "loading-and-unloading").doc;
  assert.equal(lesson.version, 4);
  assert.equal(lesson.slides.length, 5);
  assert.equal(lesson.quiz.length, 4);
  assert.equal(loading.version, 6);
  assert.equal(loading.slides.length, 7);
  assert.equal(loading.quiz.length, 7);
  assert.equal(loading.slides[0].title, "Our Docks and Trucks");
  assert.equal(loading.quiz[0].answerIndex, 2);
  assert.match(loading.slides[0].mediaPath, /safety\/lessons\/loading-and-unloading\/docks-1-docks-and-trucks\.mp4$/);
  assert.equal(loading.slides[1].title, "Talk to the Driver First");
  assert.equal(loading.quiz[1].answerIndex, 1);
  assert.match(loading.slides[1].mediaPath, /safety\/lessons\/loading-and-unloading\/driver-1-talk-to-the-driver\.mp4$/);
  assert.match(loading.slides[1].audioPath, /driver-1-talk-to-the-driver\.mp3$/);
  assert.equal(loading.slides[2].title, "Check the Trailer Is Stable");
  assert.equal(loading.quiz[2].answerIndex, 1);
  assert.match(loading.slides[2].mediaPath, /trailer-1-trailer-stable\.mp4$/);
  assert.match(loading.slides[2].audioPath, /trailer-1-trailer-stable\.mp3$/);
  assert.equal(loading.slides[3].title, "Light On, Dock Plate Set");
  assert.equal(loading.quiz[3].answerIndex, 0);
  assert.match(loading.slides[3].mediaPath, /light-1-dock-light\.mp4$/);
  assert.match(loading.slides[3].audioPath, /light-1-dock-light\.mp3$/);
  assert.equal(loading.slides[4].title, "Entering with Equipment");
  assert.equal(loading.quiz[4].answerIndex, 0);
  assert.match(loading.slides[4].mediaPath, /seatbelt-1-entering\.mp4$/);
  assert.match(loading.slides[4].audioPath, /seatbelt-1-entering\.mp3$/);
  assert.equal(loading.slides[5].title, "Can't See? Drive Backwards");
  assert.equal(loading.quiz[5].answerIndex, 0);
  assert.match(loading.slides[5].mediaPath, /backward-1-drive-backwards\.mp4$/);
  assert.match(loading.slides[5].audioPath, /backward-1-drive-backwards\.mp3$/);
  const equipment = docs.lessons.find((l) => l.id === "forklift-and-power-jack-safety").doc;
  assert.equal(equipment.slides.length, 19);
  assert.equal(equipment.quiz.length, 10);
  assert.ok(equipment.slides.every((s) => s.type === "image" && s.posterPath === null && s.audioPath.endsWith(".mp3")));
  assert.deepEqual(equipment.slides.map((s) => s.title).slice(0, 2), ["Pre-Shift Check", "Seatbelt On, Every Time"]);
  assert.equal(equipment.slides.at(-1).title, "Park It Right");
  assert.deepEqual(equipment.quiz.map((q) => q.answerIndex), [1, 0, 2, 1, 3, 1, 2, 0, 3, 1]);
  assert.doesNotMatch(JSON.stringify(equipment.quiz), /key/i);
  assert.equal(loading.slides[6].title, "Wrap Up with the Driver");
  assert.equal(loading.quiz[6].answerIndex, 0);
  assert.match(loading.slides[6].mediaPath, /paperwork-1-wrap-up\.mp4$/);
  assert.match(loading.slides[6].audioPath, /paperwork-1-wrap-up\.mp3$/);
  for (const { doc } of docs.lessons) assert.equal(doc.passMark, 80);
  assert.equal(lesson.slides[3].title, "Steel-Toe Boots Required");
  assert.match(lesson.slides[3].mediaPath, /welcome-4-steel-toe-boots\.mp4$/);
  assert.match(lesson.slides[3].posterPath, /welcome-4-steel-toe-boots-poster\.jpg$/);
  assert.match(lesson.slides[3].audioPath, /welcome-4-steel-toe-boots\.mp3$/);
  assert.equal(lesson.slides[4].title, "Know Your Fire Extinguishers and Exits");
  assert.equal(lesson.quiz[3].answerIndex, 0);
  assert.match(lesson.slides[4].audioPath, /welcome-5-fire-exits\.mp3$/);
  const chemical = docs.lessons.find((l) => l.id === "chemical-production-safety").doc;
  assert.equal(chemical.version, 2);
  assert.equal(chemical.slides.length, 12);
  assert.equal(chemical.quiz.length, 10);
  assert.ok(chemical.slides.every((s) => s.type === "image" && s.audioPath.endsWith(".mp3")));
  assert.equal(chemical.slides[0].title, "Coverall On, Every Time");
  assert.equal(chemical.slides.at(-1).title, "Not Even One Drip");
  const drip = chemical.quiz.find((q) => q.q.startsWith("A single drop"));
  assert.equal(drip.options[drip.answerIndex], "Clean it up right away");
  assert.ok(docs.uploads.every((u) => u.storagePath.startsWith("safety/lessons/")));
  assert.ok(lesson.slides.find((s) => s.type === "video").posterPath.endsWith(".jpg"), "the video has a poster");
  for (const { file } of docs.uploads) assert.ok(readFileSync(new URL(`../../safety-content/media/${file}`, import.meta.url)).length < (file.endsWith(".mp4") ? 3_000_000 : 200_000), `${file} stays small`);
});
test("bad content is refused with the field that is wrong", () => {
  const base = content.lessons[0];
  const bad = (patch) => () => contentToDocs({ categories: content.categories, lessons: [{ ...base, ...patch }] });
  assert.throws(bad({ slides: [{ type: "gif", media: "a.svg", caption: "x" }] }), /type must be one of image, video, 3d/);
  assert.throws(bad({ quiz: [{ q: "Q", options: ["a", "b"], answerIndex: 2, explanation: "e" }] }), /answerIndex/);
  assert.throws(bad({ categoryId: "nope" }), /not a category/);
  assert.throws(bad({ slides: [{ type: "image", media: "../x.svg", caption: "x" }] }), /file name/);
  assert.throws(bad({ slides: [{ type: "image", media: "a.svg", poster: "p.jpg", caption: "x" }] }), /only video slides have a poster/);
  assert.throws(() => validateLesson("x", { ...lesson, slides: [{ ...lesson.slides[0], mediaPath: "profile-photos/u/a.jpg" }] }), /under safety\//);
});
test("the browser never gets answers or explanations before submitting; media comes back as signed URLs", async () => {
  const view = await publicLesson("welcome-to-uniquem", lesson, async (path) => `https://signed.example/${path}`);
  const json = JSON.stringify(view);
  assert.doesNotMatch(json, /answerIndex|explanation/);
  assert.deepEqual(Object.keys(view.quiz[0]).sort(), ["options", "q"]);
  assert.equal(view.slides[2].type, "video");
  assert.match(view.slides[2].url, /^https:\/\/signed\.example\/safety\/lessons\/welcome-to-uniquem\/.+\.mp4$/);
  assert.match(view.slides[2].posterUrl, /poster\.jpg$/);
  assert.match(view.slides[0].audioUrl, /^https:\/\/signed\.example\/safety\/lessons\/welcome-to-uniquem\/welcome-1-office\.mp3$/, "narration comes from Storage like the other media");
});
test("grading happens on the server: score in percent, pass at the pass mark, explanations only after", () => {
  const right = lesson.quiz.map((q) => q.answerIndex), wrongOne = right.map((a, i) => i === 0 ? (a + 1) % lesson.quiz[0].options.length : a);
  assert.deepEqual({ ...gradeQuiz(lesson, right), results: undefined }, { score: 100, passed: true, correct: lesson.quiz.length, total: lesson.quiz.length, passMark: 80, results: undefined });
  const two = gradeQuiz(lesson, wrongOne);
  assert.equal(two.score, 75); assert.equal(two.passed, false, "3 of 4 is below 80");
  assert.equal(two.results[0].correct, false); assert.ok(two.results[0].explanation);
  for (const answers of [undefined, [], [0, 0], [0, 0, 9], [0, 0, "1"], [0, 0, 1.5]]) assert.throws(() => gradeQuiz(lesson, answers), /Answer every question/);
});
test("progress: attempts are kept, a pass stays a pass, and a new lesson version starts over", () => {
  const key = { uid: "ann", lessonId: "welcome-to-uniquem", version: 1 }, t1 = new Date("2026-10-29T16:00:00Z"), t2 = new Date("2026-10-29T16:05:00Z");
  assert.equal(progressStatus(undefined, 1), "not_started");
  assert.equal(progressStatus({ lessonVersion: 1, attempts: [], passed: false }, 1), "not_started", "viewed only");
  const failed = nextProgress(undefined, key, { score: 33, passed: false }, t1);
  assert.equal(progressStatus(failed, 1), "failed"); assert.equal(failed.completedAt, null);
  const passed = nextProgress(failed, { ...key, topics: ["Welcome", "Steel-toe boots"] }, { score: 100, passed: true, correct: 4, total: 4 }, t2);
  assert.deepEqual([passed.attempts.length, passed.passed, passed.completedAt], [2, true, t2]);
  assert.deepEqual(passed.attempts[1].topics, ["Welcome", "Steel-toe boots"]);
  assert.equal(passed.attempts[0].topics, undefined, "a failed attempt keeps no topic list");
  const retake = nextProgress(passed, key, { score: 67, passed: false }, new Date());
  assert.equal(progressStatus(retake, 1), "passed", "a lower retake doesn't undo a pass");
  assert.deepEqual(progressView(retake, 1), { status: "passed", attempts: 3, lastScore: 67, bestScore: 100, completedAt: t2.toISOString(), viewedAt: t1.toISOString(), review: true });
  assert.equal(progressStatus(retake, 2), "not_started", "lesson updated: everyone retakes it");
  assert.equal(nextProgress(retake, { ...key, version: 2 }, { score: 33, passed: false }, t1).attempts.length, 1);
});
test("access: only people with the Safety mini app (assigned staff and super admins) get in; everyone's progress is super admins only", async () => {
  const named = (fields) => ({ firstName: "T", lastName: "P", ...fields });
  const records = { boss: named({ email: "boss@uniquem.ca", type: "super_admin", miniApps: [] }), sam: named({ email: "sam@uniquem.ca", type: "staff", miniApps: ["safety"] }), pat: named({ email: "pat@uniquem.ca", type: "staff", miniApps: ["party"] }) };
  const database = { collection: () => ({ doc: (id) => ({ get: async () => ({ exists: id in records, data: () => records[id] }) }) }) };
  const request = (uid) => ({ auth: { uid, token: { email: records[uid].email, email_verified: true } } });
  assert.equal((await requireMiniApp(request("sam"), "safety", database)).uid, "sam");
  assert.equal((await requireMiniApp(request("boss"), "safety", database)).uid, "boss");
  await assert.rejects(() => requireMiniApp(request("pat"), "safety", database), /not authorized/);
  await assert.rejects(() => requireMiniApp({}, "safety", database), /not authorized/);
  const source = readFileSync(new URL("../safety-functions.js", import.meta.url), "utf8");
  const beforeReport = source.split("export const getSafetyReport")[0];
  assert.match(beforeReport.split("export const listSafetyProgress")[1], /if \(!isSuperAdmin\(access\)\) throw new HttpsError\("permission-denied"/);
  assert.doesNotMatch(beforeReport, /request\.data\??\.uid/, "a person can only read and write their own progress");
  const reportFn = source.split("export const getSafetyReport")[1];
  assert.match(reportFn, /requireMiniApp\(request, "safety"\)/);
  assert.match(reportFn, /if \(!isSuperAdmin\(access\)\) throw new HttpsError\("permission-denied"/);
  const resetFn = source.split("export const resetSafetyProgress")[1];
  assert.match(resetFn, /requireMiniApp\(request, "safety"\)/);
  assert.match(resetFn, /if \(!isSuperAdmin\(access\)\) throw new HttpsError\("permission-denied"/);
  assert.match(source, /progressId\(access\.uid, id\)/, "own progress is always keyed by the caller's uid");
});
test("reset keeps every attempt, marks the open pass, and the lesson shows as not started until they pass again", () => {
  const key = { uid: "ann", lessonId: "welcome-to-uniquem", version: 1 }, t1 = new Date("2026-10-29T16:00:00Z"), t2 = new Date("2026-10-29T16:05:00Z"), t3 = new Date("2026-11-17T18:00:00Z"), t4 = new Date("2026-11-17T18:20:00Z");
  const failed = nextProgress(undefined, key, { score: 33, passed: false, correct: 1, total: 4 }, t1);
  const passed = nextProgress(failed, { ...key, topics: ["Welcome"] }, { score: 100, passed: true, correct: 4, total: 4 }, t2);
  assert.equal(resetProgress(failed, { version: 1, by: "boss", now: t3 }), null);
  const reset = resetProgress(passed, { version: 1, by: "boss", now: t3 });
  assert.equal(reset.passed, false); assert.equal(reset.completedAt, null); assert.equal(reset.attempts.length, 2);
  assert.equal(reset.attempts[0].resetAt, undefined, "a failed attempt is not marked reset");
  assert.equal(reset.attempts[1].resetBy, "boss"); assert.equal(reset.attempts[1].resetAt, t3); assert.deepEqual(reset.attempts[1].topics, ["Welcome"]);
  assert.equal(progressStatus(reset, 1), "not_started"); assert.equal(progressView(reset, 1).review, true);
  const again = nextProgress(reset, { ...key, topics: ["Welcome"] }, { score: 100, passed: true, correct: 4, total: 4 }, t4);
  assert.equal(again.passed, true); assert.equal(again.attempts[1].resetAt, t3, "the old pass is still there"); assert.equal(again.attempts.length, 3);
  assert.equal(progressStatus(again, 1), "passed");
});
test("a safety record lists every passing attempt, newest first, including ones that were reset", () => {
  const lessons = [
    { id: "welcome", title: "Welcome to Uniquem", category: "Uniquem Basics", version: 4 },
    { id: "chem", title: "Chemical Production Safety", category: "Chemical Production", version: 2 },
  ];
  const welcome = { lessonVersion: 4, passed: true, completedAt: new Date("2026-11-10T18:00:00Z"), attempts: [
    { at: new Date("2026-11-01T18:00:00Z"), score: 100, passed: true, resetAt: new Date("2026-11-05T18:00:00Z"), resetBy: "boss" },
    { at: new Date("2026-11-02T18:00:00Z"), score: 50, passed: false },
    { at: new Date("2026-11-10T18:00:00Z"), score: 90, passed: true, correct: 9, total: 10, topics: ["Welcome"] },
  ] };
  const oldChem = { lessonVersion: 1, passed: true, attempts: [{ at: new Date("2026-11-01T18:00:00Z"), score: 80, passed: true, correct: 8, total: 10, topics: ["Coverall"] }] };
  const report = safetyReport({ person: { firstName: "Sam", lastName: "Lee", email: "sam@uniquem.ca" }, lessons, progressByLesson: { welcome, chem: oldChem }, now: new Date("2026-11-16T20:04:00Z") });
  assert.equal(report.company, "Uniquem");
  assert.equal(report.generatedAt, "2026-11-16T20:04:00.000Z");
  assert.deepEqual(report.lessons[0].passes.map((pass) => pass.score), [90, 100]);
  assert.equal(report.lessons[0].passes[0].correct, 9);
  assert.equal(report.lessons[0].passes[1].resetAt, "2026-11-05T18:00:00.000Z");
  assert.equal(report.lessons[0].passes[1].correct, null, "passes saved before this change have a percent only");
  assert.equal(report.lessons[0].passes[1].topics, null);
  assert.deepEqual(report.lessons[1].passes, [], "a pass on an older lesson version does not count");
  assert.ok(report.lessons[0].passes.every((pass) => pass.score !== 50));
});
test("the record PDF is letter size, lists a reset pass, and does not list a failed attempt", async () => {
  const pdf = await safetyReportPdf({ name: "Sam Lee", email: "sam@uniquem.ca", company: "Uniquem", generatedAt: "2026-11-16T20:04:00.000Z", lessons: [
    { title: "Welcome to Uniquem", category: "Uniquem Basics", version: 4, passes: [
      { completedAt: "2026-11-10T18:00:00.000Z", score: 100, correct: 4, total: 4, topics: ["Welcome"], resetAt: null },
      { completedAt: "2026-11-01T18:00:00.000Z", score: 90, correct: 9, total: 10, topics: ["No smoking"], resetAt: "2026-11-05T18:00:00.000Z" },
    ] },
    { title: "Chemical Production Safety", category: "Chemical Production", version: 2, passes: [] },
  ] });
  const raw = Buffer.from(pdf).toString("latin1");
  const text = [...raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)].flatMap((match) => {
    let body = Buffer.from(match[1].replace(/\r?\n$/, ""), "latin1");
    try { body = inflateSync(body); } catch { /* already plain */ }
    const source = body.toString("latin1");
    return [...source.matchAll(/<([0-9A-Fa-f]+)> Tj/g)].map((hit) => Buffer.from(hit[1], "hex").toString("latin1"));
  }).join("\n");
  assert.match(text, /Sam Lee/);
  assert.match(text, /4\/4, 100%/);
  assert.match(text, /9\/10, 90%/);
  assert.ok(text.indexOf("4/4, 100%") < text.indexOf("Reset "), "the newest pass is listed before the reset one");
  assert.match(text, /Not completed/);
  assert.match(text, /I confirm I have reviewed/);
  assert.match(text, /Employee signature/);
  assert.match(text, /Supervisor signature/);
  assert.doesNotMatch(text, /50%/);
  const doc = await PDFDocument.load(pdf);
  assert.equal(doc.getPageCount(), 1);
  assert.deepEqual(doc.getPage(0).getSize(), { width: 612, height: 792 });
});
test("Firestore and Storage stay closed to the browser: Safety data and media go only through the guarded callables", () => {
  const firestore = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"), storage = readFileSync(new URL("../../storage.rules", import.meta.url), "utf8");
  for (const rules of [firestore, storage]) { assert.match(rules, /allow read, write: if false;/); assert.doesNotMatch(rules, /if true|request\.auth != null/); }
});
test("narration: every slide has a small MP3 from Storage", () => {
  for (const { id, doc } of docs.lessons) for (const slide of doc.slides) assert.match(slide.audioPath, new RegExp(`^safety/lessons/${id}/.+\\.mp3$`));
});
test("Firestore layout: one top-level collection, safety, with everything in subcollections under it", () => {
  assert.deepEqual(SAFETY_PATHS, { content: "safety/content", categories: "safety/content/categories", lessons: "safety/content/lessons", progress: "safety/progress", records: "safety/progress/records" });
  for (const [name, path] of Object.entries(SAFETY_PATHS)) assert.equal(path.split("/").length % 2 === 0 ? "doc" : "collection", ["content", "progress"].includes(name) ? "doc" : "collection", name);
  const source = readFileSync(new URL("../safety-functions.js", import.meta.url), "utf8");
  assert.doesNotMatch(source.replaceAll('db.collection("users")', ""), /db\.collection\("/, "safety callables only use SAFETY_PATHS");
});
test("the old top-level safetyCategories / safetyLessons / safetyProgress collections never come back", () => {
  const root = fileURLToPath(new URL("../..", import.meta.url)), self = fileURLToPath(import.meta.url), skip = new Set(["node_modules", "dist", ".git", ".firebase", ".seo-build", "reports"]);
  const walk = (dir) => readdirSync(dir).flatMap((name) => { if (skip.has(name)) return []; const path = join(dir, name); return statSync(path).isDirectory() ? walk(path) : /\.(js|mjs|ts|tsx|json|md|yml|rules)$/.test(name) && name !== "package-lock.json" ? [path] : []; });
  for (const file of walk(root)) if (file !== self) assert.doesNotMatch(readFileSync(file, "utf8"), /safety(Categories|Lessons|Progress)\b/, file.slice(root.length));
});
