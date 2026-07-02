/**
 * Frame-rate-decoupled view state.
 *
 * Scroll and pointer are written here by DOM listeners and read inside the
 * WebGL frame loop. Nothing in this module triggers React renders — the
 * canvas samples it every frame, DOM sections animate via GSAP/framer.
 */

export interface ViewState {
  /** 0..1 progress through the whole document */
  scroll: number;
  /** lenis-reported velocity, px/frame-ish */
  velocity: number;
  /** pointer in NDC, -1..1, +y up */
  pointerX: number;
  pointerY: number;
  /** viewport size */
  width: number;
  height: number;
  reducedMotion: boolean;
}

export const viewState: ViewState = {
  scroll: 0,
  velocity: 0,
  pointerX: 0,
  pointerY: 0,
  width: 1,
  height: 1,
  reducedMotion: false,
};

export function bindPointer(): () => void {
  const onMove = (e: PointerEvent) => {
    viewState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    viewState.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  const onResize = () => {
    viewState.width = window.innerWidth;
    viewState.height = window.innerHeight;
  };
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onMq = () => {
    viewState.reducedMotion = mq.matches;
  };
  onResize();
  onMq();
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("resize", onResize);
  mq.addEventListener("change", onMq);
  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("resize", onResize);
    mq.removeEventListener("change", onMq);
  };
}
