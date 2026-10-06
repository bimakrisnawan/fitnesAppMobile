import { useEffect, useRef, useState } from "react";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Smoothly animates a number towards `target` (count-up stats, filling rings).
 * Runs on requestAnimationFrame, so it behaves the same on phones and on the web.
 */
export function useTween(target: number, durationMs = 900, delayMs = 0) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  const current = useRef(0);

  useEffect(() => {
    from.current = current.current;
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      if (start === null) start = now + delayMs;
      const t = Math.min(Math.max((now - start) / durationMs, 0), 1);
      const v = from.current + (target - from.current) * easeOutCubic(t);
      current.current = v;
      setValue(v);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, delayMs]);

  return value;
}

/** Re-renders every `intervalMs` and returns the current time (live countdowns). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** "in 2h 14m", "in 5 min", "now". */
export function countdownLabel(targetMs: number, now: number) {
  const mins = Math.round((targetMs - now) / 60_000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `in ${h}h ${mins % 60}m`;
  const d = Math.round(h / 24);
  return `in ${d} day${d === 1 ? "" : "s"}`;
}
