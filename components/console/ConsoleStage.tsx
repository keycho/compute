"use client";

import dynamic from "next/dynamic";

const Console = dynamic(() => import("./Console"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-bg">
      <p className="chip animate-pulse-dot">CONNECTING TO MESH</p>
    </div>
  ),
});

export default function ConsoleStage() {
  return <Console />;
}
