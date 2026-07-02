"use client";

import { useSyncExternalStore } from "react";
import { getEngine, type MarketSnapshot } from "./market";

const serverSnapshot = (): MarketSnapshot => getEngine().getSnapshot();

export function useMarkets(): MarketSnapshot {
  const engine = getEngine();
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, serverSnapshot);
}
