// Safety mini app (assignable): lessons, pre-written quizzes graded on the server, and each person's progress.
// Content is data (Firestore safety/content/..., Storage safety/), loaded with scripts/load-safety-content.mjs. See safety.js for the shapes.
// Every callable checks requireMiniApp(request, "safety") first. A person only ever reads or writes their own progress;
// listSafetyProgress and getSafetyReport are for super admins only.
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";
import { db, callable, isSuperAdmin, requireMiniApp, text } from "./core.js";
import { miniAppsFor } from "./miniApps.js";
import { MEDIA_PREFIX, SAFETY_PATHS, currentProgress, gradeQuiz, nextProgress, progressId, progressView, publicLesson, safetyReport } from "./safety.js";
import { safetyReportPdf } from "./safety-report-pdf.js";

const categories = () => db.collection(SAFETY_PATHS.categories), lessons = () => db.collection(SAFETY_PATHS.lessons), progress = () => db.collection(SAFETY_PATHS.records);
/** Media URLs last an hour: long enough to finish a lesson, short enough that a copied link soon stops working. */
const URL_LIFETIME_MS = 60 * 60 * 1000;
function sign(path) {
  if (!path.startsWith(MEDIA_PREFIX)) throw new HttpsError("failed-precondition", "This lesson's media is misconfigured.");
  return getStorage().bucket().file(path).getSignedUrl({ version: "v4", action: "read", expires: Date.now() + URL_LIFETIME_MS }).then(([url]) => url);
}
const lessonId = (value) => { const id = text(value, "lesson", 64); if (!/^[a-z0-9-]+$/.test(id)) throw new HttpsError("invalid-argument", "Enter a valid lesson."); return id; };
async function loadLesson(id) { const snapshot = await lessons().doc(id).get(); if (!snapshot.exists) throw new HttpsError("not-found", "That lesson no longer exists."); return snapshot.data(); }
const summary = (doc) => { const l = doc.data(); return { id: doc.id, categoryId: l.categoryId, title: l.title, order: l.order, version: l.version, passMark: l.passMark, slideCount: l.slides.length, questionCount: l.quiz.length, kinds: [...new Set(l.slides.map((s) => s.type))] }; };
const byOrder = (a, b) => a.order - b.order || a.title.localeCompare(b.title);

/** Categories, lessons (no slides or answers) and the signed-in person's own progress on each lesson. */
export const listSafety = onCall(callable, async (request) => {
  const access = await requireMiniApp(request, "safety");
  const [cats, less, mine] = await Promise.all([categories().get(), lessons().get(), progress().where("uid", "==", access.uid).get()]);
  const own = new Map(mine.docs.map((doc) => [doc.data().lessonId, doc.data()]));
  const list = less.docs.map(summary).sort(byOrder).map((lesson) => ({ ...lesson, progress: progressView(own.get(lesson.id), lesson.version) }));
  return { categories: cats.docs.map((doc) => ({ id: doc.id, title: doc.data().title, description: doc.data().description ?? "", order: doc.data().order })).sort(byOrder), lessons: list, canViewProgress: isSuperAdmin(access) };
});

/** One lesson to play: slides with short-lived media URLs and the quiz questions without answers. Marks it as viewed for the caller. */
export const getSafetyLesson = onCall(callable, async (request) => {
  const access = await requireMiniApp(request, "safety");
  const id = lessonId(request.data?.lessonId), lesson = await loadLesson(id), ref = progress().doc(progressId(access.uid, id));
  const existing = (await ref.get()).data();
  if (!currentProgress(existing, lesson.version)) await ref.set({ uid: access.uid, lessonId: id, lessonVersion: lesson.version, viewedAt: FieldValue.serverTimestamp(), attempts: [], passed: false, completedAt: null });
  return { lesson: await publicLesson(id, lesson, sign), progress: progressView(existing, lesson.version) };
});

/** Grades the caller's answers on the server, saves the attempt on their own progress and returns the score with the correct answers and explanations. */
export const submitSafetyQuiz = onCall(callable, async (request) => {
  const access = await requireMiniApp(request, "safety");
  const id = lessonId(request.data?.lessonId), lesson = await loadLesson(id), grade = gradeQuiz(lesson, request.data?.answers), ref = progress().doc(progressId(access.uid, id));
  const saved = await db.runTransaction(async (tx) => {
    const next = nextProgress((await tx.get(ref)).data(), { uid: access.uid, lessonId: id, version: lesson.version, topics: lesson.slides.map((slide) => slide.title) }, grade, new Date());
    tx.set(ref, next);
    return next;
  });
  return { ...grade, progress: progressView(saved, lesson.version) };
});

/** Super admins only: every person who has the Safety mini app, against every lesson, with status and scores. */
export const listSafetyProgress = onCall(callable, async (request) => {
  const access = await requireMiniApp(request, "safety");
  if (!isSuperAdmin(access)) throw new HttpsError("permission-denied", "This account is not authorized.");
  const [people, less, cats, all] = await Promise.all([db.collection("users").get(), lessons().get(), categories().get(), progress().limit(10000).get()]);
  const catTitle = new Map(cats.docs.map((doc) => [doc.id, doc.data().title]));
  const lessonList = less.docs.map(summary).sort(byOrder).map(({ id, title, categoryId, version }) => ({ id, title, category: catTitle.get(categoryId) ?? "", version }));
  const users = people.docs.filter((doc) => miniAppsFor(doc.data().type, doc.data().miniApps).includes("safety")).map((doc) => ({ uid: doc.id, firstName: doc.data().firstName, lastName: doc.data().lastName, email: doc.data().email })).sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  const records = new Map(all.docs.map((doc) => [doc.id, doc.data()]));
  const cells = Object.fromEntries(users.flatMap((user) => lessonList.map((lesson) => [progressId(user.uid, lesson.id), progressView(records.get(progressId(user.uid, lesson.id)), lesson.version)])));
  return { users, lessons: lessonList, cells };
});

/** Super admins only: one employee's Safety record as a PDF. Failed attempts are not included. */
export const getSafetyReport = onCall(callable, async (request) => {
  const access = await requireMiniApp(request, "safety");
  if (!isSuperAdmin(access)) throw new HttpsError("permission-denied", "This account is not authorized.");
  const uid = text(request.data?.uid, "person", 128);
  const person = await db.collection("users").doc(uid).get();
  if (!person.exists || !miniAppsFor(person.data().type, person.data().miniApps).includes("safety")) throw new HttpsError("not-found", "That person does not have Safety.");
  const [less, cats, records] = await Promise.all([lessons().get(), categories().get(), progress().where("uid", "==", uid).get()]);
  const catTitle = new Map(cats.docs.map((doc) => [doc.id, doc.data().title]));
  const lessonList = less.docs.map((doc) => ({ id: doc.id, ...summary(doc), category: catTitle.get(doc.data().categoryId) ?? "" })).sort(byOrder);
  const progressByLesson = Object.fromEntries(records.docs.map((doc) => [doc.data().lessonId, doc.data()]));
  const report = safetyReport({ person: { firstName: person.data().firstName, lastName: person.data().lastName, email: person.data().email }, lessons: lessonList, progressByLesson, now: new Date() });
  const pdf = await safetyReportPdf(report);
  const file = `${report.name.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "employee"}-safety-record.pdf`;
  return { filename: file, pdf: pdf.toString("base64") };
});
