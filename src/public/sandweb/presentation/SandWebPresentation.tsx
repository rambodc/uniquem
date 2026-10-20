import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import { narratedScenes } from "./narration";
import type { ClockRef } from "./PresentationScenes";

const PresentationScenes = lazy(() => import("./PresentationScenes"));
const chips: Record<string, string[]> = { problem: ["Sand flowback", "Equipment erosion"], sandweb: ["Hydraulic fracturing", "Well stimulation", "Remedial treatments"], result: ["Sand locked", "Oil & gas flowing", "Available worldwide"] };
const GAP_AFTER_SCENE = 1.1;

function canRenderWebGL() { try { const c = document.createElement("canvas"); return Boolean(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }

export default function SandWebPresentation() {
  const audio = useRef<HTMLAudioElement>(null), clock = useRef(0) as ClockRef;
  const [started, setStarted] = useState(false), [index, setIndex] = useState(0), [playing, setPlaying] = useState(false), [muted, setMuted] = useState(false), [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0), [webgl] = useState(canRenderWebGL), [compact, setCompact] = useState(() => matchMedia("(max-width: 760px)").matches);
  const scene = narratedScenes[index];

  useEffect(() => { const mq = matchMedia("(max-width: 760px)"); const sync = () => setCompact(mq.matches); mq.addEventListener("change", sync); return () => mq.removeEventListener("change", sync); }, []);

  // Narration time drives the 3D animation and captions. If audio cannot play
  // (blocked, failed to load), a wall clock keeps the presentation moving.
  useEffect(() => {
    let frame = 0, last = performance.now(), advanceAt = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      const el = audio.current;
      if (playing && el) {
        const audioOk = !el.error && el.readyState >= 2;
        clock.current = audioOk && !el.ended ? el.currentTime : clock.current + dt;
        if (clock.current >= scene.duration + GAP_AFTER_SCENE && !advanceAt) {
          advanceAt = now;
          if (index < narratedScenes.length - 1) setIndex(index + 1); else { setEnded(true); setPlaying(false); }
        }
      }
      setTime(clock.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, index, scene.duration, clock]);

  // Load and play the active scene's narration.
  useEffect(() => {
    const el = audio.current; if (!el || !started) return;
    clock.current = 0;
    el.src = scene.audio; el.currentTime = 0;
    if (playing) el.play().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, started]);

  useEffect(() => { const el = audio.current; if (!el || !started) return; if (playing) el.play().catch(() => undefined); else el.pause(); }, [playing, started]);
  useEffect(() => { if (audio.current) audio.current.muted = muted; }, [muted]);

  const go = useCallback((next: number) => { setEnded(false); setPlaying(true); setIndex(Math.max(0, Math.min(narratedScenes.length - 1, next))); }, []);
  const start = () => { setStarted(true); setPlaying(true); const el = audio.current; if (el) { el.src = narratedScenes[0].audio; el.play().catch(() => undefined); } };
  const replay = () => { setEnded(false); setPlaying(true); if (index === 0) { clock.current = 0; if (audio.current) { audio.current.currentTime = 0; audio.current.play().catch(() => undefined); } } else setIndex(0); };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (!started) return; if (event.key === " ") { event.preventDefault(); setPlaying((p) => !p); } if (event.key === "ArrowRight") go(index + 1); if (event.key === "ArrowLeft") go(index - 1); if (event.key === "m") setMuted((m) => !m); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [started, index, go]);

  const caption = scene.captions.find((c, i) => time >= c.start - 0.1 && time < (scene.captions[i + 1]?.start ?? c.end + 1.2));
  const progress = Math.min(1, time / scene.duration);

  return <main className="swp">
    <audio ref={audio} preload="auto" />
    <div className="swp-stage" aria-hidden="true">
      {started && webgl ? <Suspense fallback={null}><PresentationScenes scene={scene.id} duration={scene.duration} clock={clock} compact={compact} active /></Suspense> : <div className="swp-fallback"><img src="/images/products/sandweb-tote.webp" alt="" /></div>}
      <div className="swp-fade" key={`${index}-${started}`} />
    </div>
    <Link className="swp-back" to="/chemicals/sandweb"><ArrowLeft size={16} /> SandWeb</Link>

    {!started && <section className="swp-start">
      <span className="sw-kicker">Narrated 3D demo · about 1 minute</span>
      <h1>SandWeb <span>sand consolidation chemistry</span></h1>
      <p>See how SandWeb stops sand flowback, in three short scenes. Turn your sound on.</p>
      <button className="swp-play" onClick={start} aria-label="Play the narrated SandWeb demo"><Play size={34} fill="currentColor" /></button>
    </section>}

    {started && !ended && <>
      <header className="swp-title" key={scene.id}><span>{String(index + 1).padStart(2, "0")} / {String(narratedScenes.length).padStart(2, "0")}</span><h2>{scene.title}</h2><div className="swp-chips">{chips[scene.id].map((c) => <i key={c}>{c}</i>)}</div></header>
      <p className="swp-caption" aria-live="polite" key={caption?.text ?? "none"}>{caption?.text}</p>
    </>}

    {ended && <section className="swp-end">
      <span className="sw-kicker">SandWeb by Uniquem</span>
      <h2>Sand consolidation chemistry.<br /><span>Available worldwide.</span></h2>
      <p>For hydraulic fracturing, well stimulation and remedial sand control. Shipped in 1000 L totes.</p>
      <div className="sw-actions"><Link className="sw-button" to="/contact-us">Request a quote <ArrowUpRight size={17} /></Link><button className="sw-button ghost" onClick={replay}><RotateCcw size={16} /> Replay</button></div>
    </section>}

    {started && <nav className="swp-controls" aria-label="Presentation controls">
      <button onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous scene"><SkipBack size={18} /></button>
      <button onClick={() => (ended ? replay() : setPlaying((p) => !p))} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
      <button onClick={() => go(index + 1)} disabled={index === narratedScenes.length - 1} aria-label="Next scene"><SkipForward size={18} /></button>
      <div className="swp-progress">{narratedScenes.map((s, i) => <span key={s.id} onClick={() => go(i)}><b style={{ width: `${i < index || ended ? 100 : i === index ? progress * 100 : 0}%` }} /></span>)}</div>
      <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      <button onClick={replay} aria-label="Replay from the start"><RotateCcw size={18} /></button>
    </nav>}
  </main>;
}
