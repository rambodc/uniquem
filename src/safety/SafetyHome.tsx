import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Box, CheckCircle2, Clock, Image, PlayCircle, XCircle } from "lucide-react";
import { listSafety, type SafetyCategory, type SafetyLessonSummary, type SafetySlideType } from "../core/api";
import { Page, messageOf } from "../party/Workspace";
import { KIND_LABELS, startLabel, statusText } from "./safety";
import { useResume } from "../core/resilience";
import "./safety.css";

const KIND_ICONS: Record<SafetySlideType, typeof Image> = { image: Image, video: PlayCircle, "3d": Box };
const STATUS_ICONS = { not_started: Clock, passed: CheckCircle2, failed: XCircle };

export function LessonCard({ lesson }: { lesson: SafetyLessonSummary }) {
  const StatusIcon = STATUS_ICONS[lesson.progress.status];
  return <article className={`sf-lesson ${lesson.progress.status}`}>
    <div className="sf-lesson-main">
      <h3>{lesson.title}</h3>
      <p className="sf-meta">{lesson.slideCount} slides · {lesson.questionCount} quiz questions · pass mark {lesson.passMark}%</p>
      <div className="sf-kinds">{lesson.kinds.map((kind) => { const Icon = KIND_ICONS[kind]; return <span key={kind}><Icon size={14} aria-hidden /> {KIND_LABELS[kind]}</span>; })}</div>
    </div>
    <div className="sf-lesson-side">
      <span className={`sf-badge ${lesson.progress.status}`}><StatusIcon size={14} aria-hidden /> {statusText(lesson.progress)}</span>
      <Link className={lesson.progress.status === "passed" ? "ws-chip" : "ws-button sf-start"} to={`/safety/lesson/${lesson.id}`}>{startLabel(lesson.progress)}</Link>
    </div>
  </article>;
}

export function CategoryList({ categories, lessons }: { categories: SafetyCategory[]; lessons: SafetyLessonSummary[] }) {
  return <div className="sf-cats">{categories.map((category, index) => {
    const items = lessons.filter((lesson) => lesson.categoryId === category.id), passed = items.filter((lesson) => lesson.progress.status === "passed").length;
    return <section key={category.id} className={`sf-cat${items.length ? "" : " soon"}`} aria-labelledby={`sf-cat-${category.id}`}>
      <header className="sf-cat-head">
        <span className="sf-cat-num">{index + 1}</span>
        <div><h2 id={`sf-cat-${category.id}`}>{category.title}</h2>{category.description && <p>{category.description}</p>}</div>
        {items.length ? <span className="sf-count">{passed} of {items.length} passed</span> : <span className="sf-soon">Coming soon</span>}
      </header>
      {items.length > 0 && <div className="sf-lessons">{items.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}</div>}
    </section>;
  })}</div>;
}

/** Safety: the categories and their lessons, with the signed-in person's own status on each. */
export default function SafetyHome() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listSafety>> | null>(null), [error, setError] = useState("");
  const load = () => listSafety().then((next) => { setData(next); setError(""); }, (cause) => setError(messageOf(cause, "Safety training could not be loaded. Try again.")));
  useEffect(() => { void load(); }, []);
  useResume(load);
  return <Page title="Safety" subtitle="Short lessons, then a quick quiz. Pass each one to complete it." back={{ to: "/dashboard", label: "Dashboard" }}
    actions={data?.canViewProgress ? <Link className="ws-chip" to="/safety/progress"><BarChart3 size={16} /> Everyone's progress</Link> : undefined}>
    {error && <div className="ws-status error" role="alert">{error}</div>}
    {!data && !error && <div className="ws-empty">Loading lessons…</div>}
    {data && (data.categories.length ? <CategoryList categories={data.categories} lessons={data.lessons} /> : <div className="ws-empty">No safety lessons yet.</div>)}
  </Page>;
}
