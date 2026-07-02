"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * reducedMotion="user" lets framer strip transform/layout animation for
 * prefers-reduced-motion users at animation time while still animating
 * opacity, so SSR markup and the first client render always agree —
 * branching on useReducedMotion() during render would bake opacity:0
 * into the SSR HTML and never clear it for those users.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
