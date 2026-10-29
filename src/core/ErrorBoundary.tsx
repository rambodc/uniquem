import { Component, type ReactNode } from "react";
import { isChunkLoadError, reloadOnce } from "./resilience";

const RETRY_DELAYS = [1000, 3000, 8000];
type State = { error: unknown; attempts: number; resetKey: unknown };

/** Never a blank screen: a render error shows a loader and retries by itself (1 s, 3 s, 8 s); a missing chunk after a deploy reloads the page once.
 * Only after the retries fail does it ask the person to reload. Changing page (resetKey) starts over. */
export default class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: unknown }, State> {
  state: State = { error: null, attempts: 0, resetKey: this.props.resetKey };
  private timer = 0;
  static getDerivedStateFromError(error: unknown) { return { error }; }
  static getDerivedStateFromProps(props: { resetKey?: unknown }, state: State) { return props.resetKey !== state.resetKey ? { error: null, attempts: 0, resetKey: props.resetKey } : null; }
  componentDidCatch(error: unknown) {
    globalThis.console.error("Page error", error);
    if (isChunkLoadError(error) && reloadOnce()) return;
    this.schedule();
  }
  componentWillUnmount() { window.clearTimeout(this.timer); }
  private schedule() {
    window.clearTimeout(this.timer);
    const delay = RETRY_DELAYS[this.state.attempts];
    if (delay == null) return;
    this.timer = window.setTimeout(() => this.setState((state) => ({ error: null, attempts: state.attempts + 1 })), delay);
  }
  render() {
    if (!this.state.error) return this.props.children;
    if (this.state.attempts < RETRY_DELAYS.length) return <main className="center-state" role="status">Reconnecting to the Uniquem workspace…</main>;
    return <main className="center-state denied"><div><p>This page could not be loaded. Check your connection, then reload.</p><button className="ws-button" onClick={() => window.location.reload()}>Reload</button></div></main>;
  }
}
