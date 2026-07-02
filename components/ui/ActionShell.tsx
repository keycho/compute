import Link from "next/link";
import Nav from "@/components/sections/Nav";
import Scramble from "@/components/ui/Scramble";

/**
 * Shared chrome for the action surfaces (/run, /generate, /share):
 * nav, a quiet ambient glow instead of the full WebGL journey, a small
 * header, and a footer strip that points at the console for depth.
 */
export default function ActionShell({
  chip,
  title,
  sub,
  children,
}: {
  chip: string;
  title: React.ReactNode;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -6%, rgba(91,124,255,0.1), transparent 62%), radial-gradient(ellipse 55% 42% at 82% 108%, rgba(139,92,246,0.07), transparent 65%), #030304",
        }}
      />
      <Nav />
      <main className="container-x pb-28 pt-32">
        <div className="mx-auto mb-10 w-full max-w-[780px]">
          <p className="chip mb-5">
            <Scramble text={chip} />
          </p>
          <h1 className="display text-[clamp(2rem,3.6vw,3rem)]">{title}</h1>
          {sub && (
            <p className="mt-4 max-w-[560px] font-mono text-[13.5px] leading-[1.75] text-dim">
              {sub}
            </p>
          )}
        </div>
        {children}
        <div className="mx-auto mt-14 flex w-full max-w-[780px] items-center justify-between border-t border-line pt-5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
          <span>powered by the q0r mesh · verified execution</span>
          <Link href="/app" className="text-signal transition-colors hover:text-signal-bright">
            watch it happen → console
          </Link>
        </div>
      </main>
    </div>
  );
}
