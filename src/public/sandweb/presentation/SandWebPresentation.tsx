import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import EndingChoices, { isPreviewHost } from "./Ending";
import { endingClip, narratedScenes, type Caption } from "./narration";
import type { ClockRef } from "./Stage3";
import { viewAt } from "./timeline";

const Stage3 = lazy(() => import("./Stage3"));
const EndingWorld = lazy(() => import("./EndingWorld"));
const chips: Record<string, string[]> = { problem: ["Sand & fines migration", "Equipment wear"], sandweb: ["Existing wells", "Pumped with the frac", "No resin coating"], result: ["Oil & gas flowing", "Sand stays downhole", "Up to 90% less flowback*"] };
const GAP_AFTER_SCENE = 1.1;
type Phase = "start" | "scenes" | "close";
const ASK_AT = (endingClip.captions[endingClip.captions.length - 1]?.start ?? endingClip.duration) - 0.3;

function canRenderWebGL() { try { const c = document.createElement("canvas"); return Boolean(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }
const captionAt = (captions: readonly Caption[], t: number) => captions.find((c, i) => t >= c.start - 0.1 && t < (captions[i + 1]?.start ?? c.end + 1.2));

export default function SandWebPresentation() {
  const audio = useRef<HTMLAudioElement>(null), logo = useRef<HTMLDivElement>(null), clock = useRef(0) as ClockRef, closeClock = useRef(0);
  const [phase, setPhase] = useState<Phase>("start"), [index, setIndex] = useState(0), [playing, setPlaying] = useState(false), [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0), [closeTime, setCloseTime] = useState(0), [webgl] = useState(canRenderWebGL), [panel, setPanel] = useState(false), [preview] = useState(isPreviewHost), [compact, setCompact] = useState(() => matchMedia("(max-width: 760px)").matches);
  const scene = narratedScenes[index], started = phase !== "start";

  useEffect(() => { const mq = matchMedia("(max-width: 760px)"); const sync = () => setCompact(mq.matches); mq.addEventListener("change", sync); return () => mq.removeEventListener("change", sync); }, []);

  const playSrc = useCallback((src: string) => { const el = audio.current; if (!el) return; el.src = src; el.currentTime = 0; el.play().catch(() => undefined); }, []);

  const finish = useCallback(() => { clock.current = narratedScenes[narratedScenes.length - 1].duration; closeClock.current = 0; setPlaying(true); setPhase("close"); playSrc(endingClip.audio); }, [clock, playSrc]);

  // Narration time drives the 3D animation and captions. If audio cannot play
  // (blocked or failed to load), a wall clock keeps the presentation moving.
  useEffect(() => {
    if (phase !== "scenes" && phase !== "close") return;
    let frame = 0, last = performance.now(), advanced = false;
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      const el = audio.current, audioOk = Boolean(el && !el.error && el.readyState >= 2 && !el.ended);
      if (playing && el) {
        if (phase === "scenes") {
          clock.current = audioOk ? el.currentTime : clock.current + dt;
          if (clock.current >= scene.duration + GAP_AFTER_SCENE && !advanced) {
            advanced = true;
            if (index < narratedScenes.length - 1) setIndex(index + 1);
            else finish();
          }
        } else closeClock.current = audioOk ? el.currentTime : Math.min(endingClip.duration + 5, closeClock.current + dt);
      }
      setTime(clock.current); setCloseTime(closeClock.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, playing, index, scene.duration, clock, finish]);

  // Load the active scene's narration whenever the scene changes.
  useEffect(() => {
    if (phase !== "scenes") return;
    clock.current = 0;
    if (playing) playSrc(narratedScenes[index].audio); else if (audio.current) { audio.current.src = narratedScenes[index].audio; audio.current.currentTime = 0; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase === "scenes"]);

  useEffect(() => { const el = audio.current; if (!el || !started || !el.src) return; if (playing) el.play().catch(() => undefined); else el.pause(); }, [playing, started, phase]);
  useEffect(() => { if (audio.current) audio.current.muted = muted; }, [muted]);
  // Warm the ending scene chunk during the last scene so it starts promptly.
  useEffect(() => { if (index === narratedScenes.length - 1) void import("./EndingWorld"); }, [index]);

  const go = useCallback((next: number) => { clock.current = 0; setPhase("scenes"); setPlaying(true); setIndex(Math.max(0, Math.min(narratedScenes.length - 1, next))); }, [clock]);
  const start = () => { setPhase("scenes"); setPlaying(true); };
  const replay = () => { setPanel(false); clock.current = 0; setIndex(0); setPhase("scenes"); setPlaying(true); if (index === 0) playSrc(narratedScenes[0].audio); };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (phase !== "scenes" && phase !== "close") return; if (event.key === " ") { event.preventDefault(); setPlaying((p) => !p); } if (event.key === "ArrowRight" && phase === "scenes") go(index + 1); if (event.key === "ArrowLeft") go(phase === "close" ? narratedScenes.length - 1 : index - 1); if (event.key === "m") setMuted((m) => !m); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [phase, index, go]);

  const view = viewAt(scene.id, phase === "close" ? scene.duration : time, scene.duration);
  const caption = phase === "close" ? captionAt(endingClip.captions, closeTime) : captionAt(scene.captions, time);
  const progress = Math.min(1, time / scene.duration), ended = phase === "close";
  const showChoices = ended && closeTime >= ASK_AT;

  return <main className={`swp ${ended ? "is-ended" : ""}`}>
    <audio ref={audio} preload="auto" />
    <div className="swp-stage" aria-hidden="true">
      {ended ? (webgl ? <Suspense fallback={null}><EndingWorld anchor={logo} compact={compact} /></Suspense> : <div className="swp-fallback" />)
        : started && webgl ? <Suspense fallback={null}><Stage3 scene={scene.id} view={view.view} clock={clock} duration={scene.duration} compact={compact} active /></Suspense> : <div className="swp-fallback"><img src="/images/products/sandweb-tote.webp" alt="" /></div>}
      <div className="swp-fade" key={`${index}-${started}-${ended}`} />
      {!ended && <div className="swp-cut" style={{ opacity: started ? view.fade : 0 }} />}
    </div>
    <Link className="swp-back" to="/chemicals/sandweb"><ArrowLeft size={16} /> SandWeb</Link>

    {!started && <section className="swp-start">
      <span className="sw-kicker">Narrated 3D demo · about 80 seconds</span>
      <h1>SandWeb <span>sand and fines control chemistry</span></h1>
      <p>See how SandWeb holds sand and fines in place, in three short scenes. Turn your sound on.</p>
      <button className="swp-play" onClick={start} aria-label="Play the narrated SandWeb demo"><Play size={34} fill="currentColor" /></button>
    </section>}

    {preview && started && <p className="swp-preview">Preview: submissions are marked as test leads</p>}
    {phase === "scenes" && <header className="swp-title" key={scene.id}><span>{String(index + 1).padStart(2, "0")} / {String(narratedScenes.length).padStart(2, "0")} · {view.view === "pore" ? "Pore scale" : view.view === "flow" ? "Near-wellbore flow" : "Well scale"}</span><h2>{scene.title}</h2><div className="swp-chips">{chips[scene.id].map((c) => <i key={c}>{c}</i>)}</div></header>}
    {phase === "scenes" && caption && <p className="swp-caption" aria-live="polite" key={caption.text}>{caption.text}</p>}
    {phase === "scenes" && scene.id === "result" && <p className="swp-footnote">*Reported in field frac treatments.</p>}

    {ended && <section className={`swp-ending ${panel ? "has-panel" : ""}`} aria-label="Talk to the SandWeb team">
      <div className="swp-logo" ref={logo}><img src="/brand/uniquem-mark-180.png" alt="Uniquem" width={180} height={180} /></div>
      <p className="swp-brand">SandWeb by Uniquem</p>
      {!panel && (showChoices ? <h2>How would you like to <span>hear from us?</span></h2> : caption && <p className="swp-caption" aria-live="polite" key={caption.text}>{caption.text}</p>)}
      <EndingChoices showChoices={showChoices} onReplay={replay} onPanel={setPanel} />
    </section>}

    {started && <nav className="swp-controls" aria-label="Presentation controls">
      <button onClick={() => go(ended ? narratedScenes.length - 1 : index - 1)} disabled={!ended && index === 0} aria-label="Previous scene"><SkipBack size={18} /></button>
      <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
      <button onClick={() => (index === narratedScenes.length - 1 ? finish() : go(index + 1))} disabled={ended} aria-label="Next scene"><SkipForward size={18} /></button>
      <div className="swp-progress">{narratedScenes.map((s, i) => <span key={s.id} onClick={() => go(i)}><b style={{ width: `${i < index || ended ? 100 : i === index ? progress * 100 : 0}%` }} /></span>)}</div>
      <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      <button onClick={replay} aria-label="Replay from the start"><RotateCcw size={18} /></button>
    </nav>}
  </main>;
}
