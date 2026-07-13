import type { PersistedWanderMatchState } from "./types";

export function selectCurrentSpotId(state: PersistedWanderMatchState): string | null {
  const currentSpotId = state.deckSpotIds[state.currentIndex];

  if (typeof currentSpotId !== "string") {
    return null;
  }

  return currentSpotId;
}

export function selectCanUndo(state: PersistedWanderMatchState): boolean {
  return state.lastAction !== null;
}

export function selectIsFavorite(
  state: PersistedWanderMatchState,
  spotId: string,
): boolean {
  return state.favoriteSpotIds.includes(spotId);
}

export function selectFavoriteCount(state: PersistedWanderMatchState): number {
  return state.favoriteSpotIds.length;
}

export function selectViewedCount(state: PersistedWanderMatchState): number {
  return state.viewedSpotIds.length;
}

export function selectRemainingSpotCount(state: PersistedWanderMatchState): number {
  if (state.deckSpotIds.length === 0) {
    return 0;
  }

  return state.deckSpotIds.length - state.currentIndex;
}
