import Reveal from "./Reveal";
import Scramble from "./Scramble";

/**
 * Eyebrow / display title / bracketed subcopy. The corner stroke ties the
 * subcopy back to the title the way a schematic callout would.
 */
export default function SectionHeader({
  chip,
  title,
  body,
  id,
}: {
  chip: string;
  title: React.ReactNode;
  body?: string;
  id?: string;
}) {
  return (
    <div className="container-x" id={id}>
      <Reveal>
        <p className="chip mb-6">
          <Scramble text={chip} />
        </p>
        <h2 className="display max-w-[18ch] text-[clamp(2.2rem,4.6vw,4rem)]">{title}</h2>
      </Reveal>
      {body && (
        <Reveal delay={0.12} className="relative mt-8 max-w-[520px] md:ml-24">
          <span
            className="absolute -left-14 top-1 hidden h-9 w-10 border-b border-l border-line-strong md:block"
            aria-hidden
          />
          <p className="font-mono text-[14.5px] leading-[1.75] text-dim">{body}</p>
        </Reveal>
      )}
    </div>
  );
}
