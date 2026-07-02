"use client";

import { useSyncExternalStore } from "react";
import { getFeed, type FeedSnapshot } from "./feed";

const serverSnapshot = (): FeedSnapshot => getFeed().getSnapshot();

export function useFeed(): FeedSnapshot {
  const engine = getFeed();
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, serverSnapshot);
}
