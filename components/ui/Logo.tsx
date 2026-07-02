/**
 * Mark: two interlocked tetra-facets forming an open "C" around a core —
 * a crystal seen down its axis. Pure geometry, no letterforms.
 */
export default function Logo({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M16 2 L28 9 L28 12 L16 5 L4 12 L4 20 L16 27 L28 20 L28 23 L16 30 L1 21.5 L1 10.5 Z"
        fill="#EDF0F7"
      />
      <path d="M16 11 L22 14.5 L22 17.5 L16 21 L10 17.5 L10 14.5 Z" fill="#5B7CFF" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-3 ${className ?? ""}`}>
      <Logo />
      <span className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
        Compute<span className="text-mute">&nbsp;Markets</span>
      </span>
    </span>
  );
}
