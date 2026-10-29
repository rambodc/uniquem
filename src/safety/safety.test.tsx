import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import type { SafetyLesson, SafetyLessonSummary, SafetyProgress, SafetyResult } from "../core/api";
import { CategoryList } from "./SafetyHome";
import { QuizView, SlideMedia, SlideView } from "./SafetyLesson";
import { ProgressTable } from "./SafetyProgress";
import { startLabel, statusText } from "./safety";

const html = (node: ReactNode) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
const progress = (over: Partial<SafetyProgress> = {}): SafetyProgress => ({ status: "not_started", attempts: 0, lastScore: null, bestScore: null, completedAt: null, viewedAt: null, ...over });
const summary = (over: Partial<SafetyLessonSummary>): SafetyLessonSummary => ({ id: "welcome-to-uniquem", categoryId: "basics", title: "Welcome to Uniquem", order: 1, version: 1, passMark: 80, slideCount: 3, questionCount: 3, kinds: ["image", "video"], progress: progress(), ...over });
const lesson: SafetyLesson = { id: "l", categoryId: "c", title: "L", version: 1, passMark: 80, slides: [], quiz: [{ q: "Smoking?", options: ["Nowhere", "Outside"] }, { q: "Forklift?", options: ["Run", "Eye contact"] }] };

describe("Safety", () => {
  it("badges and buttons follow the person's own status", () => {
    expect(statusText(progress())).toBe("Not started");
    expect(statusText(progress({ status: "passed", bestScore: 100, lastScore: 67 }))).toBe("Passed · 100%");
    expect(statusText(progress({ status: "failed", lastScore: 33 }))).toBe("Failed · 33%");
    expect([startLabel(progress()), startLabel(progress({ status: "failed" })), startLabel(progress({ status: "passed" }))]).toEqual(["Start lesson", "Retake", "Review"]);
  });
  it("lists categories in order; an empty one says Coming soon", () => {
    const out = html(<CategoryList categories={[{ id: "basics", title: "Uniquem Basics", description: "", order: 1 }, { id: "loading", title: "Loading Products", description: "", order: 3 }]} lessons={[summary({ progress: progress({ status: "passed", attempts: 1, bestScore: 100, lastScore: 100 }) })]} />);
    expect(out).toContain("Uniquem Basics"); expect(out).toContain("1 of 1 passed"); expect(out).toContain("Passed · 100%");
    expect(out).toContain("Coming soon"); expect(out).toContain('href="/safety/lesson/welcome-to-uniquem"');
  });
  it("image slides lazy-load; video has controls and a poster and never autoplays; 3D waits for its lazy viewer", () => {
    const img = html(<SlideMedia slide={{ type: "image", title: "T", caption: "C", url: "https://x/a.svg", posterUrl: null, audioUrl: null }} />);
    expect(img).toContain('loading="lazy"');
    const video = html(<SlideMedia slide={{ type: "video", title: "T", caption: "C", url: "https://x/v.mp4", posterUrl: "https://x/p.jpg", audioUrl: null }} />);
    expect(video).toContain("controls"); expect(video).toContain('poster="https://x/p.jpg"'); expect(video).toContain('preload="metadata"'); expect(video).not.toContain("autoplay");
    expect(html(<SlideMedia slide={{ type: "3d", title: "T", caption: "C", url: "https://x/m.glb", posterUrl: null, audioUrl: null }} />)).toContain("Loading the 3D model");
    const source = readFileSync("src/safety/SafetyLesson.tsx", "utf8");
    expect(source).not.toMatch(/from "@react-three|from "three/); expect(source).toContain('lazy(() => import("./ModelView"))');
  });
  it("narration is a round play button on the media itself (centre on pictures, corner on video and 3D), never a text button", () => {
    const slide = (type: "image" | "video" | "3d", audioUrl: string | null) => ({ type, title: "T", caption: "C", url: `https://x/m.${type}`, posterUrl: null, audioUrl });
    const view = (slides: ReturnType<typeof slide>[]) => html(<SlideView lesson={{ ...lesson, slides }} index={0} onBack={() => undefined} onNext={() => undefined} />);
    const image = view([slide("image", "https://x/a.mp3")]);
    expect(image).toMatch(/<div class="sf-stage image">.*<button type="button" class="sf-narrate center idle" aria-label="Play narration"/s);
    expect(image).toContain('src="https://x/a.mp3"'); expect(image).not.toContain("Play audio");
    expect(view([slide("video", "https://x/a.mp3")])).toContain('class="sf-narrate corner idle"');
    expect(view([slide("3d", "https://x/a.mp3")])).toContain('class="sf-narrate corner idle"');
    expect(view([slide("image", null)])).not.toContain("sf-narrate");
    const source = readFileSync("src/safety/SafetyLesson.tsx", "utf8");
    expect(source).toMatch(/return \(\) => \{ el\?\.pause\(\); \}/); expect(source).toContain("key={`${index}:${slide.audioUrl}`}");
  });
  it("the quiz can't be submitted until every question is answered, and shows the server's grading after", () => {
    const quiz = (answers: (number | null)[], result: SafetyResult | null) => html(<QuizView lesson={lesson} answers={answers} result={result} busy={false} error="" onPick={() => undefined} onSubmit={() => undefined} onRetake={() => undefined} onReview={() => undefined} />);
    expect(quiz([0, null], null)).toMatch(/<button type="button" class="ws-button" disabled="">Submit answers/);
    expect(quiz([0, 1], null)).toMatch(/<button type="button" class="ws-button">Submit answers/);
    const failed = quiz([0, 0], { score: 50, passed: false, correct: 1, total: 2, passMark: 80, results: [{ chosen: 0, answerIndex: 0, correct: true, explanation: "No smoking anywhere." }, { chosen: 0, answerIndex: 1, correct: false, explanation: "Make eye contact." }], progress: progress({ status: "failed" }) });
    expect(failed).toContain("50%"); expect(failed).toContain("Not passed yet"); expect(failed).toContain("Make eye contact."); expect(failed).toContain("Retake quiz");
    expect(failed).toContain('aria-label="Correct answer"'); expect(failed).toContain('aria-label="Your answer"');
  });
  it("progress board: people × lessons", () => {
    const out = html(<ProgressTable board={{ users: [{ uid: "u1", firstName: "Sam", lastName: "Lee", email: "sam@uniquem.ca" }], lessons: [{ id: "l1", title: "PPE Basics", category: "PPE & Safety", version: 1 }], cells: { u1_l1: progress({ status: "failed", attempts: 2, lastScore: 67 }) } }} />);
    expect(out).toContain("Sam Lee"); expect(out).toContain("Failed · 67%"); expect(out).toContain("2 attempts");
  });
});
