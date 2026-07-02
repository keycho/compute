"use client";

import dynamic from "next/dynamic";

const Explorer = dynamic(() => import("./Explorer"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-bg">
      <p className="chip animate-pulse-dot">CONNECTING TO MESH</p>
    </div>
  ),
});

export default function ExplorerStage() {
  return <Explorer />;
}
