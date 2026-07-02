import Link from "next/link";
import Reveal from "@/components/ui/Reveal";

/**
 * What the network can do, stated plainly. No counters, no simulated
 * throughput — capability over scale. Protocol activity lives in the
 * explorer, reached through receipts and navigation.
 */

type Item = { label: string; tag?: "beta" | "soon" };

const COLUMNS: Array<{
  heading: string;
  items: Item[];
  cta?: { label: string; href: string };
}> = [
  {
    heading: "Execution",
    items: [
      { label: "AI chat" },
      { label: "Reasoning" },
      { label: "Image generation" },
      { label: "Video", tag: "beta" },
      { label: "Custom containers", tag: "soon" },
    ],
    cta: { label: "execute something", href: "/execute" },
  },
  {
    heading: "Settlement",
    items: [
      { label: "Pay per execution" },
      { label: "USDC settlement" },
      { label: "Verified execution receipts" },
    ],
  },
  {
    heading: "Workers",
    items: [
      { label: "Bring your own GPU" },
      { label: "Permissionless participation" },
      { label: "Self-custody staking" },
    ],
    cta: { label: "supply a gpu", href: "/supply" },
  },
];

export default function Capabilities() {
  return (
    <section className="hairline-t hairline-b relative" id="capabilities">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[rgba(6,6,6,0.66)]" />
      <div className="container-x relative grid gap-12 py-[clamp(70px,9vh,110px)] md:grid-cols-3 md:gap-10">
        {COLUMNS.map((col, i) => (
          <Reveal key={col.heading} delay={i * 0.08}>
            <div>
              <h2 className="col-heading mb-5">{col.heading}</h2>
              <ul className="flex flex-col">
                {col.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-baseline justify-between gap-3 border-b border-line py-3 font-mono text-[13.5px] text-dim first:border-t"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="text-signal" aria-hidden>
                        →
                      </span>
                      {item.label}
                    </span>
                    {item.tag && (
                      <span
                        className={`rounded-[3px] border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] ${
                          item.tag === "beta"
                            ? "border-[rgba(255,255,255,0.35)] text-cyan"
                            : "border-line text-mute"
                        }`}
                      >
                        {item.tag}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {col.cta && (
                <Link
                  href={col.cta.href}
                  className="mt-5 inline-flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.12em] text-signal transition-colors duration-150 hover:text-signal-bright"
                >
                  {col.cta.label} <span aria-hidden>→</span>
                </Link>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
