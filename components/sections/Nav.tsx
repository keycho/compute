"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Wordmark } from "@/components/ui/Logo";

const LINKS = [
  { label: "Execute", href: "/execute" },
  { label: "Create", href: "/create" },
  { label: "Supply", href: "/supply" },
  { label: "Stake", href: "/#token" },
  { label: "Docs", href: "/#developers" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-[450ms] ease-[cubic-bezier(0.7,0,0.3,1)] ${
        scrolled
          ? "border-line bg-[rgba(3,3,4,0.78)] backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="container-x flex h-16 items-stretch justify-between">
        <Link href="/" className="flex items-center" aria-label="q0r home">
          <Wordmark />
        </Link>

        <nav className="hidden items-stretch lg:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="relative flex items-center px-5 font-mono text-[12.5px] uppercase tracking-[0.13em] text-dim transition-colors duration-150 hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-stretch lg:flex">
          <div className="mx-2 my-4 w-px bg-line" aria-hidden />
          <Link
            href="/explore"
            className="my-3 inline-flex items-center gap-2 self-center rounded-[2px] bg-signal px-6 py-[10px] font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[#050507] transition-all duration-[450ms] ease-[cubic-bezier(0.7,0,0.3,1)] hover:bg-signal-bright hover:shadow-[0_0_28px_rgba(91,124,255,0.4)]"
          >
            Explorer
            <span aria-hidden>→</span>
          </Link>
        </div>

        {/* mobile toggle */}
        <button
          className="flex w-10 items-center justify-center lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          <span className="relative block h-3.5 w-5">
            <span
              className={`absolute left-0 top-0 h-px w-full bg-ink transition-transform duration-300 ${open ? "translate-y-[7px] rotate-45" : ""}`}
            />
            <span
              className={`absolute left-0 top-[7px] h-px w-full bg-ink transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`absolute left-0 bottom-0 h-px w-full bg-ink transition-transform duration-300 ${open ? "-translate-y-[6px] -rotate-45" : ""}`}
            />
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.7, 0, 0.3, 1] }}
            className="overflow-hidden border-t border-line bg-[rgba(3,3,4,0.94)] backdrop-blur-xl lg:hidden"
            aria-label="Mobile"
          >
            <div className="container-x flex flex-col py-4">
              {LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-line py-4 font-mono text-[13px] uppercase tracking-[0.13em] text-dim"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/explore"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-[2px] bg-signal px-6 py-3.5 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[#050507]"
              >
                Explorer <span aria-hidden>→</span>
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
