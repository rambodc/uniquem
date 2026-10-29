// Safety mini app: lessons (slides) and pre-written quizzes, stored as data in Firestore and Cloud Storage.
// No Firebase calls here, so it is unit-testable. The callables are in safety-functions.js.
//
//   safetyCategories/{id}         { title, description, order }
//   safetyLessons/{id}            { categoryId, title, order, version, passMark,
//                                   slides: [{ type: "image" | "video" | "3d", mediaPath, title?, caption, posterPath?, audioPath? }],
//                                   quiz:   [{ q, options[], answerIndex, explanation }] }
//   safetyProgress/{uid}_{lesson} { uid, lessonId, lessonVersion, viewedAt, attempts: [{ at, score, passed }], passed, completedAt }
//
// Media lives in Storage under safety/ and is only reached through short-lived signed URLs from getSafetyLesson.
// The browser never receives answerIndex or explanation before the quiz is submitted; grading happens on the server.
import { HttpsError } from "firebase-functions/v2/https";

export const SLIDE_TYPES = ["image", "video", "3d"];
export const MEDIA_PREFIX = "safety/";
/** Attempts kept per person per lesson (oldest dropped). */
export const MAX_ATTEMPTS = 50;
const ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

const fail = (where, message) => { throw new Error(`${where}: ${message}`); };
const str = (value, where, max = 2000) => { if (typeof value !== "string" || !value.trim() || value.length > max) fail(where, "must be a non-empty string"); return value.trim(); };
const media = (value, where) => { const path = str(value, where, 300); if (!path.startsWith(MEDIA_PREFIX) || path.includes("..")) fail(where, `must be a Storage path under ${MEDIA_PREFIX}`); return path; };

/** Checks one lesson document (as stored) and returns it normalized. Throws with the field that is wrong. Used by the content loader and the tests. */
export function validateLesson(id, lesson) {
  const where = `lesson ${id}`;
  if (!ID.test(id)) fail(where, "id must be lowercase letters, digits and dashes");
  if (!lesson || typeof lesson !== "object") fail(where, "must be an object");
  const version = lesson.version, passMark = lesson.passMark ?? 80;
  if (!Number.isInteger(version) || version < 1) fail(where, "version must be a whole number from 1");
  if (!Number.isInteger(passMark) || passMark < 1 || passMark > 100) fail(where, "passMark must be 1 to 100");
  if (!Number.isInteger(lesson.order)) fail(where, "order must be a whole number");
  if (!Array.isArray(lesson.slides) || !lesson.slides.length || lesson.slides.length > 50) fail(where, "needs 1 to 50 slides");
  if (!Array.isArray(lesson.quiz) || !lesson.quiz.length || lesson.quiz.length > 30) fail(where, "needs 1 to 30 quiz questions");
  const slides = lesson.slides.map((slide, i) => {
    const at = `${where} slide ${i + 1}`;
    if (!SLIDE_TYPES.includes(slide?.type)) fail(at, `type must be one of ${SLIDE_TYPES.join(", ")}`);
    const out = { type: slide.type, mediaPath: media(slide.mediaPath, at), caption: str(slide.caption, at), title: slide.title ? str(slide.title, at, 160) : null, audioPath: slide.audioPath ? media(slide.audioPath, at) : null, posterPath: null };
    if (slide.posterPath) { if (slide.type !== "video") fail(at, "only video slides have a poster"); out.posterPath = media(slide.posterPath, at); }
    return out;
  });
  const quiz = lesson.quiz.map((item, i) => {
    const at = `${where} question ${i + 1}`;
    if (!Array.isArray(item?.options) || item.options.length < 2 || item.options.length > 6) fail(at, "needs 2 to 6 options");
    const options = item.options.map((option) => str(option, at, 300));
    if (!Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex >= options.length) fail(at, "answerIndex must point at an option");
    return { q: str(item.q, at, 500), options, answerIndex: item.answerIndex, explanation: str(item.explanation, at, 1000) };
  });
  return { categoryId: str(lesson.categoryId, where, 64), title: str(lesson.title, where, 160), order: lesson.order, version, passMark, slides, quiz };
}
export function validateCategory(id, category) {
  const where = `category ${id}`;
  if (!ID.test(id)) fail(where, "id must be lowercase letters, digits and dashes");
  if (!Number.isInteger(category?.order)) fail(where, "order must be a whole number");
  return { title: str(category.title, where, 120), description: category.description ? str(category.description, where, 500) : "", order: category.order };
}

/** The lesson as the browser may see it before submitting: no answers, no explanations. `sign` turns a Storage path into a URL. */
export async function publicLesson(id, lesson, sign) {
  const slides = await Promise.all(lesson.slides.map(async (slide) => ({ type: slide.type, title: slide.title ?? null, caption: slide.caption, url: await sign(slide.mediaPath), posterUrl: slide.posterPath ? await sign(slide.posterPath) : null, audioUrl: slide.audioPath ? await sign(slide.audioPath) : null })));
  return { id, categoryId: lesson.categoryId, title: lesson.title, version: lesson.version, passMark: lesson.passMark, slides, quiz: lesson.quiz.map(({ q, options }) => ({ q, options })) };
}

/** Checks the submitted answers: one option index per question. */
export function validateAnswers(answers, lesson) {
  if (!Array.isArray(answers) || answers.length !== lesson.quiz.length) throw new HttpsError("invalid-argument", "Answer every question before submitting.");
  return answers.map((answer, i) => { if (!Number.isInteger(answer) || answer < 0 || answer >= lesson.quiz[i].options.length) throw new HttpsError("invalid-argument", "Answer every question before submitting."); return answer; });
}
/** Grades on the server. Score is a whole percent; passed when it reaches the lesson's passMark. */
export function gradeQuiz(lesson, answers) {
  const chosen = validateAnswers(answers, lesson);
  const results = lesson.quiz.map((item, i) => ({ chosen: chosen[i], answerIndex: item.answerIndex, correct: chosen[i] === item.answerIndex, explanation: item.explanation }));
  const correct = results.filter((r) => r.correct).length, score = Math.round((correct / lesson.quiz.length) * 100);
  return { score, passed: score >= lesson.passMark, correct, total: lesson.quiz.length, passMark: lesson.passMark, results };
}

export const progressId = (uid, lessonId) => `${uid}_${lessonId}`;
/** Progress only counts for the lesson's current version: when a lesson is updated (version goes up) everyone starts it again. */
export const currentProgress = (progress, version) => progress && progress.lessonVersion === version ? progress : null;
/** "not_started" | "passed" | "failed" for the lesson's current version. */
export function progressStatus(progress, version) {
  const current = currentProgress(progress, version);
  if (!current?.attempts?.length) return "not_started";
  return current.passed ? "passed" : "failed";
}
/** What the person sees about their own progress on a lesson. Dates come back as ISO strings. */
export function progressView(progress, version) {
  const current = currentProgress(progress, version), attempts = current?.attempts ?? [], iso = (value) => value?.toDate?.().toISOString() ?? (value instanceof Date ? value.toISOString() : value ?? null);
  return { status: progressStatus(progress, version), attempts: attempts.length, lastScore: attempts.at(-1)?.score ?? null, bestScore: attempts.length ? Math.max(...attempts.map((a) => a.score)) : null, completedAt: iso(current?.completedAt), viewedAt: iso(current?.viewedAt) };
}
/** The progress record after one graded attempt. A pass stays a pass (a later lower score does not undo it) until the lesson's version changes. */
export function nextProgress(previous, { uid, lessonId, version }, grade, now) {
  const current = currentProgress(previous, version);
  const attempts = [...(current?.attempts ?? []), { at: now, score: grade.score, passed: grade.passed }].slice(-MAX_ATTEMPTS);
  const passed = Boolean(current?.passed) || grade.passed;
  return { uid, lessonId, lessonVersion: version, viewedAt: current?.viewedAt ?? now, attempts, passed, completedAt: current?.completedAt ?? (grade.passed ? now : null) };
}

/** Turns safety-content/content.json (media given as file names in safety-content/media/) into the Firestore documents and the Storage uploads.
 * Throws on anything invalid, so a bad content file never reaches production. */
export function contentToDocs(content) {
  const categoryIds = new Set(), uploads = new Map();
  const categories = (content?.categories ?? []).map((category) => { const doc = validateCategory(category.id, category); categoryIds.add(category.id); return { id: category.id, doc }; });
  const lessonIds = new Set();
  const lessonsOut = (content?.lessons ?? []).map((lesson) => {
    if (lessonIds.has(lesson.id)) fail(`lesson ${lesson.id}`, "id is used twice"); lessonIds.add(lesson.id);
    const path = (file, field) => { if (!file) return undefined; if (typeof file !== "string" || !/^[A-Za-z0-9._-]+$/.test(file)) fail(`lesson ${lesson.id}`, `${field} must be a file name in safety-content/media`); const storage = `${MEDIA_PREFIX}lessons/${lesson.id}/${file}`; uploads.set(storage, file); return storage; };
    const doc = validateLesson(lesson.id, { ...lesson, slides: (lesson.slides ?? []).map((slide) => ({ ...slide, mediaPath: path(slide.media, "media"), posterPath: path(slide.poster, "poster"), audioPath: path(slide.audio, "audio") })) });
    if (!categoryIds.has(doc.categoryId)) fail(`lesson ${lesson.id}`, `categoryId ${doc.categoryId} is not a category`);
    return { id: lesson.id, doc };
  });
  if (new Set(categories.map((c) => c.id)).size !== categories.length) fail("categories", "an id is used twice");
  return { categories, lessons: lessonsOut, uploads: [...uploads].map(([storagePath, file]) => ({ storagePath, file })) };
}
