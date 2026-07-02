"use client";

import { useSyncExternalStore } from "react";
import { getProtocol, type ProtocolSnapshot } from "./protocol";

const serverSnapshot = (): ProtocolSnapshot => getProtocol().getSnapshot();

export function useProtocol(): ProtocolSnapshot {
  const engine = getProtocol();
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, serverSnapshot);
}
