import Link from "next/link";
import { Wordmark } from "@/components/ui/Logo";

const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: "Markets",
    links: [
      { label: "Perpetuals", href: "#markets" },
      { label: "Indexes", href: "#analytics" },
      { label: "Tokenized compute", href: "#markets" },
      { label: "Liquidity vaults", href: "#markets" },
    ],
  },
  {
    heading: "Protocol",
    links: [
      { label: "Governance", href: "#protocol" },
      { label: "Oracle", href: "#protocol" },
      { label: "Security", href: "#protocol" },
      { label: "Audits", href: "#protocol" },
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
      { label: "Status", href: "#top" },
      { label: "Terms", href: "#top" },
      { label: "Privacy", href: "#top" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="hairline-t relative overflow-hidden bg-[rgba(5,5,7,0.78)] backdrop-blur-[6px]">
      <div className="container-x grid gap-12 py-20 md:grid-cols-[1.2fr_repeat(4,1fr)]">
        <div>
          <Wordmark />
          <p className="mt-5 max-w-[260px] font-mono text-[12.5px] leading-[1.7] text-mute">
            The financial layer for compute. GPU capacity, priced and settled
            on-chain.
          </p>
          <p className="mt-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
            <span className="h-1.5 w-1.5 rounded-full bg-pos animate-pulse-dot" aria-hidden />
            All systems operational
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
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint md:flex-row">
          <span>© 2026 Compute Markets. All rights reserved.</span>
          <span>Not investment advice. Markets carry risk.</span>
        </div>
      </div>

      {/* signature: the wordmark sinking into the void */}
      <div
        aria-hidden
        className="pointer-events-none select-none overflow-hidden pb-2 text-center font-display text-[clamp(4rem,13vw,12rem)] font-bold leading-[0.78] tracking-[-0.04em] text-[rgba(237,240,247,0.035)]"
      >
        COMPUTE MARKETS
      </div>
    </footer>
  );
}
