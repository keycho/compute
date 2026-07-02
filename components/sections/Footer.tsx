import Link from "next/link";
import { Wordmark } from "@/components/ui/Logo";

const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: "Use",
    links: [
      { label: "Execute", href: "/execute" },
      { label: "Create", href: "/create" },
      { label: "Supply", href: "/supply" },
      { label: "Stake", href: "/#token" },
    ],
  },
  {
    heading: "Protocol",
    links: [
      { label: "Why q0r", href: "/#why" },
      { label: "How it works", href: "/#how" },
      { label: "Stake Q0R", href: "/#token" },
    ],
  },
  {
    heading: "Explore",
    links: [
      { label: "Live explorer", href: "/explore" },
      { label: "Network", href: "/explore" },
      { label: "Blocks", href: "/explore" },
      { label: "Jobs", href: "/explore" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "API reference", href: "#developers" },
      { label: "SDKs", href: "#developers" },
      { label: "Subgraphs", href: "#developers" },
      { label: "GitHub", href: "#developers" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Blog", href: "#top" },
      { label: "Security", href: "#top" },
      { label: "Terms", href: "#top" },
      { label: "Privacy", href: "#top" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="hairline-t relative overflow-hidden bg-[rgba(6,6,6,0.82)] backdrop-blur-[6px]">
      <div className="container-x grid gap-12 py-20 md:grid-cols-[1.2fr_repeat(5,1fr)]">
        <div>
          <Wordmark />
          <p className="mt-5 max-w-[260px] font-mono text-[12.5px] leading-[1.7] text-mute">
            The execution layer for decentralized compute. Workloads in,
            verified results out.
          </p>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
            Every execution leaves a verified receipt
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h3 className="col-heading mb-5">{col.heading}</h3>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="font-mono text-[13px] text-dim transition-colors duration-150 hover:text-signal-bright"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="hairline-t">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute md:flex-row">
          <span>© 2026 q0r. All rights reserved.</span>
          <span>Run anything. Verify everything.</span>
        </div>
      </div>

      {/* signature: the mark sinking into the void */}
      <div
        aria-hidden
        className="pointer-events-none select-none overflow-hidden pb-2 text-center font-display text-[clamp(6rem,20vw,19rem)] font-bold leading-[0.78] tracking-[-0.04em] text-[rgba(237,240,247,0.035)]"
      >
        q0r
      </div>
    </footer>
  );
}
