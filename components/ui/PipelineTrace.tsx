"use client";

/**
 * The lifecycle line every action surfaces while it runs:
 * finding worker → assigned nd-x → executing → streaming → verified.
 * The infrastructure stays visible without a dashboard in sight.
 */
export default function PipelineTrace({
  stages,
  active,
  node,
}: {
  stages: readonly string[];
  active: number;
  node?: string;
}) {
  return (
    <p className="font-mono text-[11px] leading-[1.8]">
      {stages.map((s, i) => {
        const label = s === "assigned" && node ? `assigned ${node}` : s;
        const state = i < active ? "done" : i === active ? "live" : "todo";
        return (
          <span key={s}>
            {i > 0 && <span className="text-faint"> → </span>}
            <span
              className={
                state === "done"
                  ? "text-pos"
                  : state === "live"
                    ? "animate-pulse-dot text-signal-bright"
                    : "text-faint"
              }
            >
              {state === "live" && i === 0 ? `${label}...` : label}
            </span>
          </span>
        );
      })}
    </p>
  );
}
