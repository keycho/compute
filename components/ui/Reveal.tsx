"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * House reveal: rise + defocus resolve. Triggers once, just before the
 * element crosses the lower quarter of the viewport. Reduced-motion
 * handling comes from MotionConfig reducedMotion="user" in the layout
 * (transforms are stripped, opacity still resolves), so server and
 * client render identical markup.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "span" | "li" | "header";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -18% 0px" }}
      transition={{ duration: 0.8, delay, ease: [0.7, 0, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}
