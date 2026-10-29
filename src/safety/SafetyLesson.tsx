import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Pause, RotateCcw, Volume2, X } from "lucide-react";
import { getSafetyLesson, submitSafetyQuiz, type SafetyLesson as Lesson, type SafetyResult, type SafetySlide } from "../core/api";
import { Page, messageOf } from "../party/Workspace";
import "./safety.css";

// three.js only loads when a 3D slide is actually opened.
const ModelView = lazy(() => import("./ModelView"));

function AudioButton({ url }: { url: string }) {
  const audio = useRef<HTMLAudioElement>(null), [playing, setPlaying] = useState(false);
  const toggle = () => { const el = audio.current; if (!el) return; if (el.paused) void el.play(); else el.pause(); };
  return <><audio ref={audio} src={url} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    <button type="button" className="ws-chip" onClick={toggle}>{playing ? <Pause size={16} /> : <Volume2 size={16} />} {playing ? "Pause audio" : "Play audio"}</button></>;
}

export function SlideMedia({ slide }: { slide: SafetySlide }) {
  const label = slide.title ?? slide.caption;
  if (slide.type === "video") return <video className="sf-video" src={slide.url} poster={slide.posterUrl ?? undefined} controls preload="metadata" playsInline aria-label={label} />;
  if (slide.type === "3d") return <Suspense fallback={<div className="sf-media-note">Loading the 3D model…</div>}><ModelView url={slide.url} label={label} /></Suspense>;
  return <img className="sf-image" src={slide.url} alt={label} loading="lazy" decoding="async" />;
}

export function SlideView({ lesson, index, onBack, onNext }: { lesson: Lesson; index: number; onBack: () => void; onNext: () => void }) {
  const slide = lesson.slides[index], last = index === lesson.slides.length - 1;
  return <section className="sf-player" aria-label={`Slide ${index + 1} of ${lesson.slides.length}`}>
    <div className={`sf-stage ${slide.type}`}><SlideMedia key={slide.url} slide={slide} />{slide.type === "3d" && <span className="sf-hint">Drag to turn · pinch or scroll to zoom</span>}</div>
    <div className="sf-copy">
      <div className="sf-dots" aria-hidden>{lesson.slides.map((_, i) => <span key={i} className={i === index ? "on" : i < index ? "done" : ""} />)}</div>
      <span className="sf-step">Slide {index + 1} of {lesson.slides.length}</span>
      {slide.title && <h2>{slide.title}</h2>}
      <p>{slide.caption}</p>
      {slide.audioUrl && <AudioButton key={slide.audioUrl} url={slide.audioUrl} />}
    </div>
    <nav className="sf-nav">
      <button type="button" className="ws-button ghost" onClick={onBack} disabled={index === 0}><ArrowLeft size={17} /> Back</button>
      <button type="button" className="ws-button" onClick={onNext}>{last ? <><ClipboardCheck size={17} /> Take the quiz</> : <>Next <ArrowRight size={17} /></>}</button>
    </nav>
  </section>;
}

export function QuizView({ lesson, answers, result, busy, error, onPick, onSubmit, onRetake, onReview }: { lesson: Lesson; answers: (number | null)[]; result: SafetyResult | null; busy: boolean; error: string; onPick: (q: number, option: number) => void; onSubmit: () => void; onRetake: () => void; onReview: () => void }) {
  const ready = answers.every((answer) => answer !== null);
  return <section className="sf-quiz" aria-label="Quiz">
    {result && <div className={`sf-result ${result.passed ? "passed" : "failed"}`} role="status">
      <span className="sf-score">{result.score}%</span>
      <div><b>{result.passed ? "Passed" : "Not passed yet"}</b><p>{result.correct} of {result.total} correct · pass mark {result.passMark}%{result.passed ? ". This lesson is complete." : ". Review the slides and try again."}</p></div>
    </div>}
    {!result && <p className="sf-quiz-intro">Answer all {lesson.quiz.length} questions, then submit. You need {lesson.passMark}% to pass.</p>}
    <ol className="sf-questions">{lesson.quiz.map((item, q) => {
      const graded = result?.results[q];
      return <li key={q} className={graded ? (graded.correct ? "right" : "wrong") : ""}>
        <fieldset disabled={Boolean(result) || busy}>
          <legend>{item.q}</legend>
          {item.options.map((option, o) => {
            const mark = graded ? (o === graded.answerIndex ? "answer" : o === graded.chosen ? "chosen" : "") : "";
            return <label key={o} className={`sf-option ${mark}${answers[q] === o ? " picked" : ""}`}>
              <input type="radio" name={`q${q}`} checked={answers[q] === o} onChange={() => onPick(q, o)} />
              <span>{option}</span>
              {mark === "answer" && <Check size={17} aria-label="Correct answer" />}{mark === "chosen" && <X size={17} aria-label="Your answer" />}
            </label>;
          })}
        </fieldset>
        {graded && <p className="sf-explain"><b>{graded.correct ? "Correct." : "Not quite."}</b> {graded.explanation}</p>}
      </li>;
    })}</ol>
    {error && <div className="ws-status error" role="alert">{error}</div>}
    <div className="sf-nav">
      {result ? <>
        <button type="button" className="ws-button ghost" onClick={onReview}><ArrowLeft size={17} /> Review slides</button>
        {result.passed ? <Link className="ws-button" to="/safety">Back to Safety</Link> : <button type="button" className="ws-button" onClick={onRetake}><RotateCcw size={17} /> Retake quiz</button>}
      </> : <>
        <button type="button" className="ws-button ghost" onClick={onReview}><ArrowLeft size={17} /> Back to slides</button>
        <button type="button" className="ws-button" disabled={!ready || busy} onClick={onSubmit}>{busy ? "Grading…" : "Submit answers"}</button>
      </>}
    </div>
  </section>;
}

/** One lesson: its slides one at a time, then the quiz. Grading happens on the server. */
export default function SafetyLessonPage() {
  const { lessonId = "" } = useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null), [error, setError] = useState(""), [stage, setStage] = useState<"slides" | "quiz">("slides"), [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]), [result, setResult] = useState<SafetyResult | null>(null), [busy, setBusy] = useState(false), [quizError, setQuizError] = useState("");
  useEffect(() => { getSafetyLesson(lessonId).then(({ lesson: loaded }) => { setLesson(loaded); setAnswers(loaded.quiz.map(() => null)); }, (cause) => setError(messageOf(cause, "This lesson could not be loaded. Try again."))); }, [lessonId]);
  useEffect(() => { window.scrollTo(0, 0); }, [stage, index]);
  const retake = () => { setResult(null); setQuizError(""); setAnswers(lesson?.quiz.map(() => null) ?? []); };
  async function submit() {
    if (!lesson || busy) return;
    setBusy(true); setQuizError("");
    try { setResult(await submitSafetyQuiz(lesson.id, answers as number[])); } catch (cause) { setQuizError(messageOf(cause, "Your answers could not be graded. Try again.")); } finally { setBusy(false); }
  }
  return <Page narrow eyebrow="Safety training" title={lesson?.title ?? "Lesson"} subtitle={lesson ? (stage === "slides" ? `${lesson.slides.length} slides, then a ${lesson.quiz.length}-question quiz` : "Quiz") : undefined} back={{ to: "/safety", label: "Safety" }}>
    {error && <div className="ws-status error" role="alert">{error} <Link to="/safety">Back to Safety</Link></div>}
    {!lesson && !error && <div className="ws-empty sf-gap">Loading the lesson…</div>}
    {lesson && stage === "slides" && <SlideView lesson={lesson} index={index} onBack={() => setIndex((i) => Math.max(0, i - 1))} onNext={() => index < lesson.slides.length - 1 ? setIndex(index + 1) : setStage("quiz")} />}
    {lesson && stage === "quiz" && <QuizView lesson={lesson} answers={answers} result={result} busy={busy} error={quizError} onPick={(q, o) => setAnswers((all) => all.map((a, i) => i === q ? o : a))} onSubmit={() => void submit()} onRetake={retake} onReview={() => { setStage("slides"); setIndex(0); if (result) retake(); }} />}
  </Page>;
}
