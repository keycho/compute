"use client";

import dynamic from "next/dynamic";

/**
 * Client-only mount for the WebGL canvas. The page stays server-rendered;
 * the canvas hydrates in after first paint. The static void color beneath
 * it means the handoff is invisible.
 */
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => null,
});

export default function Stage() {
  return <Scene />;
}
