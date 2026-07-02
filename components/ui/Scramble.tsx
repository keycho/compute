"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-=<>/";

/**
 * Character decode: text resolves left to right out of noise. Runs once
 * when scrolled into view; optionally re-runs on hover of a parent via
 * the returned replay handler pattern (hoverTarget prop).
 */
export default function Scramble({
  text,
  className,
  duration = 520,
  tick = 30,
  replayOnHover = false,
}: {
  text: string;
  className?: string;
  duration?: number;
  tick?: number;
  replayOnHover?: boolean;
}) {
  const [display, setDisplay] = useState(text);
  const el = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const played = useRef(false);

  const run = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(text);
      return;
    }
    if (timer.current) clearInterval(timer.current);
    const steps = Math.ceil(duration / tick);
    let step = 0;
    timer.current = setInterval(() => {
      step++;
      const solved = Math.floor((step / steps) * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === " " || i < solved) out += ch;
        else out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
      }
      setDisplay(out);
      if (step >= steps) {
        setDisplay(text);
        if (timer.current) clearInterval(timer.current);
      }
    }, tick);
  }, [text, duration, tick]);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !played.current) {
          played.current = true;
          run();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      if (timer.current) clearInterval(timer.current);
    };
  }, [run]);

  return (
    <span
      ref={el}
      className={className}
      onMouseEnter={replayOnHover ? run : undefined}
      aria-label={text}
    >
      {display}
    </span>
  );
}
