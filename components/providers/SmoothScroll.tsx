"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { bindPointer, viewState } from "@/lib/viewState";

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis smooth scroll wired into GSAP ScrollTrigger and the shared
 * viewState sampled by the WebGL loop. Respects prefers-reduced-motion
 * by letting native scrolling through untouched.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const unbindPointer = bindPointer();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        viewState.scroll = max > 0 ? window.scrollY / max : 0;
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => {
        window.removeEventListener("scroll", onScroll);
        unbindPointer();
      };
    }

    // reset stale progress from a previous route before lenis reports
    const max = document.documentElement.scrollHeight - window.innerHeight;
    viewState.scroll = max > 0 ? window.scrollY / max : 0;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });

    lenis.on("scroll", (e: { progress: number; velocity: number }) => {
      viewState.scroll = e.progress;
      viewState.velocity = e.velocity;
      ScrollTrigger.update();
    });

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      unbindPointer();
    };
  }, []);

  return <>{children}</>;
}
