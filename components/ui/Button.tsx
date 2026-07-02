"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Buttons are instruments: mono, uppercase, square. Primary fills with
 * signal and blooms on hover; ghost keeps a hairline and floods on hover.
 * State swap, no movement.
 */
export default function Button({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  size?: "md" | "lg";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2.5 rounded-[2px] font-mono uppercase tracking-[0.14em] transition-all duration-[450ms] ease-[cubic-bezier(0.7,0,0.3,1)] select-none";
  const sizing =
    size === "lg" ? "px-9 py-[17px] text-[13px]" : "px-7 py-[13px] text-[12px]";
  const look =
    variant === "primary"
      ? "bg-signal text-[#050507] font-medium hover:bg-signal-bright hover:shadow-[0_0_32px_rgba(91,124,255,0.45)]"
      : "border border-line-strong text-ink hover:border-[rgba(91,124,255,0.55)] hover:shadow-[0_0_24px_rgba(91,124,255,0.2)] hover:text-signal-bright";

  return (
    <Link href={href} className={`${base} ${sizing} ${look} ${className}`}>
      {children}
    </Link>
  );
}
