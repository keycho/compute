"use client";

import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";

/** Small line-art glyphs for each workload class, 36px reticle. */
const Icons = {
  inference: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx="18" cy="18" r="3" />
      <path d="M18 4 V10 M18 26 V32 M4 18 H10 M26 18 H32" strokeOpacity="0.7" />
      <path d="M8 8 L12.5 12.5 M23.5 23.5 L28 28 M28 8 L23.5 12.5 M12.5 23.5 L8 28" strokeOpacity="0.35" />
    </svg>
  ),
  training: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M4 30 L12 20 L19 24 L32 6" />
      <path d="M25 6 H32 V13" />
      <path d="M4 34 H32" strokeOpacity="0.3" strokeDasharray="2 3" />
    </svg>
  ),
  rendering: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M18 3 L31 10.5 V25.5 L18 33 L5 25.5 V10.5 Z" />
      <path d="M18 3 V18 M18 18 L31 10.5 M18 18 L5 10.5" strokeOpacity="0.5" />
    </svg>
  ),
  simulation: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M4 24 C 9 14, 14 14, 18 24 S 28 34, 32 24" />
      <path d="M4 14 C 9 4, 14 4, 18 14 S 28 24, 32 14" strokeOpacity="0.4" />
    </svg>
  ),
  video: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.25">
      <rect x="4" y="8" width="28" height="20" rx="2" />
      <path d="M15 13 L23 18 L15 23 Z" fill="currentColor" fillOpacity="0.5" stroke="none" />
    </svg>
  ),
  scientific: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M14 4 H22 M18 4 V14 L28 30 A2 2 0 0 1 26 33 H10 A2 2 0 0 1 8 30 L18 14" />
      <path d="M12 24 H24" strokeOpacity="0.5" />
    </svg>
  ),
};

const WORKLOADS = [
  {
    icon: Icons.inference,
    title: "Inference",
    tag: "qwen3-8b · llama-3.3 · whisper-v3",
    body: "Serve models close to your users. Latency-based routing places requests on the nearest healthy GPU.",
  },
  {
    icon: Icons.training,
    title: "Training",
    tag: "lora · dreambooth · rlhf",
    body: "Fan a run out across hundreds of GPUs without owning one. Checkpoints stream back as you go.",
  },
  {
    icon: Icons.rendering,
    title: "Rendering",
    tag: "sdxl · flux-dev · cycles",
    body: "Frames render in parallel across the mesh and return assembled. Farms of any size, on demand.",
  },
  {
    icon: Icons.simulation,
    title: "Simulation",
    tag: "fold-md · cfd-mesh",
    body: "Physics, weather, and agent runs on burst capacity — pay for the hours the run actually takes.",
  },
  {
    icon: Icons.video,
    title: "Video generation",
    tag: "wan-2.2 · hunyuan-vid",
    body: "Diffusion and video pipelines on current-generation hardware, without a reservation queue.",
  },
  {
    icon: Icons.scientific,
    title: "Scientific compute",
    tag: "batch · long-running · verified",
    body: "Long-running batch jobs with verifiable results — every output ships with its execution proof.",
  },
];

export default function Workloads() {
  return (
    <section className="relative py-[clamp(110px,14vh,170px)]" id="workloads">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,3,4,0.66), rgba(3,3,4,0.4) 45%, rgba(3,3,4,0.62))",
        }}
      />
      <div className="relative">
        <SectionHeader
          chip="FOR APPLICATIONS"
          title={
            <>
              Submit workloads.
              <br />
              One API. Global execution<span className="text-signal">.</span>
            </>
          }
          body="Describe the container, the hardware class, and the verification policy. The network handles placement, execution, and proof — the same request whether the job needs one GPU or a thousand."
        />

        <div className="container-x mt-16 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {WORKLOADS.map((w, i) => (
            <Reveal key={w.title} delay={(i % 3) * 0.08}>
              <article className="glass reticle glow-hover group flex h-full flex-col p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink">
                    {w.title}
                  </h3>
                  <span className="h-9 w-9 text-mute transition-colors duration-[450ms] ease-[cubic-bezier(0.7,0,0.3,1)] group-hover:text-signal-bright">
                    {w.icon}
                  </span>
                </div>
                <p className="flex-1 font-mono text-[13px] leading-[1.7] text-mute">{w.body}</p>
                <p className="mt-5 border-t border-line pt-3 font-mono text-[10.5px] tracking-[0.08em] text-mute transition-colors duration-300 group-hover:text-signal">
                  {w.tag}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
