import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { URL } from "node:url";
import { requireMiniApp } from "../core.js";
import { SAFETY_PATHS, contentToDocs, gradeQuiz, nextProgress, progressStatus, progressView, publicLesson, validateLesson } from "../safety.js";

const content = JSON.parse(readFileSync(new URL("../../safety-content/content.json", import.meta.url), "utf8"));
const docs = contentToDocs(content);
const lesson = docs.lessons.find((l) => l.id === "welcome-to-uniquem").doc;

test("the sample content is valid: Uniquem Basics stays, Loading and Unloading is the other category", () => {
  assert.deepEqual(docs.categories.map((c) => c.doc.title), ["Uniquem Basics", "Loading and Unloading"]);
  assert.deepEqual(docs.lessons.map((l) => l.id), ["welcome-to-uniquem", "loading-and-unloading"]);
  const loading = docs.lessons.find((l) => l.id === "loading-and-unloading").doc;
  assert.equal(lesson.slides.length, 4);
  assert.equal(lesson.quiz.length, 3);
  assert.equal(loading.version, 2);
  assert.equal(loading.slides.length, 3);
  assert.equal(loading.quiz.length, 3);
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
  for (const { doc } of docs.lessons) assert.equal(doc.passMark, 80);
  assert.equal(lesson.slides[3].title, "Steel-Toe Boots Required");
  assert.match(lesson.slides[3].mediaPath, /welcome-4-steel-toe-boots\.mp4$/);
  assert.match(lesson.slides[3].posterPath, /welcome-4-steel-toe-boots-poster\.jpg$/);
  assert.match(lesson.slides[3].audioPath, /welcome-4-steel-toe-boots\.mp3$/);
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
  assert.deepEqual({ ...gradeQuiz(lesson, right), results: undefined }, { score: 100, passed: true, correct: 3, total: 3, passMark: 80, results: undefined });
  const two = gradeQuiz(lesson, wrongOne);
  assert.equal(two.score, 67); assert.equal(two.passed, false, "2 of 3 is below 80");
  assert.equal(two.results[0].correct, false); assert.ok(two.results[0].explanation);
  for (const answers of [undefined, [], [0, 0], [0, 0, 9], [0, 0, "1"], [0, 0, 1.5]]) assert.throws(() => gradeQuiz(lesson, answers), /Answer every question/);
});
test("progress: attempts are kept, a pass stays a pass, and a new lesson version starts over", () => {
  const key = { uid: "ann", lessonId: "welcome-to-uniquem", version: 1 }, t1 = new Date("2026-10-29T16:00:00Z"), t2 = new Date("2026-10-29T16:05:00Z");
  assert.equal(progressStatus(undefined, 1), "not_started");
  assert.equal(progressStatus({ lessonVersion: 1, attempts: [], passed: false }, 1), "not_started", "viewed only");
  const failed = nextProgress(undefined, key, { score: 33, passed: false }, t1);
  assert.equal(progressStatus(failed, 1), "failed"); assert.equal(failed.completedAt, null);
  const passed = nextProgress(failed, key, { score: 100, passed: true }, t2);
  assert.deepEqual([passed.attempts.length, passed.passed, passed.completedAt], [2, true, t2]);
  const retake = nextProgress(passed, key, { score: 67, passed: false }, new Date());
  assert.equal(progressStatus(retake, 1), "passed", "a lower retake doesn't undo a pass");
  assert.deepEqual(progressView(retake, 1), { status: "passed", attempts: 3, lastScore: 67, bestScore: 100, completedAt: t2.toISOString(), viewedAt: t1.toISOString() });
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
  const body = source.split("export const listSafetyProgress")[1];
  assert.match(body, /if \(!isSuperAdmin\(access\)\) throw new HttpsError\("permission-denied"/);
  assert.doesNotMatch(source, /request\.data\??\.uid/, "nobody can ask for another person's progress");
  assert.match(source, /progressId\(access\.uid, id\)/, "own progress is always keyed by the caller's uid");
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
  assert.doesNotMatch(source.replace('db.collection("users")', ""), /db\.collection\("/, "safety callables only use SAFETY_PATHS");
});
test("the old top-level safetyCategories / safetyLessons / safetyProgress collections never come back", () => {
  const root = fileURLToPath(new URL("../..", import.meta.url)), self = fileURLToPath(import.meta.url), skip = new Set(["node_modules", "dist", ".git", ".firebase", ".seo-build", "reports"]);
  const walk = (dir) => readdirSync(dir).flatMap((name) => { if (skip.has(name)) return []; const path = join(dir, name); return statSync(path).isDirectory() ? walk(path) : /\.(js|mjs|ts|tsx|json|md|yml|rules)$/.test(name) && name !== "package-lock.json" ? [path] : []; });
  for (const file of walk(root)) if (file !== self) assert.doesNotMatch(readFileSync(file, "utf8"), /safety(Categories|Lessons|Progress)\b/, file.slice(root.length));
});
