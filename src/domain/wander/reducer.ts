import { createShuffledDeck, getUniqueSpotIds } from "./deck";
import { recoverPersistedWanderState } from "./migrate";
import { selectCurrentSpotId } from "./selectors";
import type {
  LastDiscoverAction,
  PersistedWanderMatchState,
  RandomSource,
  WanderEvent,
  WanderReducerContext,
} from "./types";

export function reduceWanderState(
  state: PersistedWanderMatchState,
  event: WanderEvent,
  context: WanderReducerContext,
): PersistedWanderMatchState {
  const random = context.random ?? Math.random;

  switch (event.type) {
    case "HYDRATE":
      return recoverPersistedWanderState(event.persistedState, context.spotIds, random);

    case "COMMIT_CURRENT":
      return commitCurrentSpot(state, event.action, context.spotIds, random);

    case "UNDO_LAST":
      return undoLastAction(state);

    case "TOGGLE_FAVORITE":
      return toggleFavorite(state, event.spotId, context.spotIds);

    case "RESET_HISTORY":
      return resetHistory(state, context.spotIds, random);

    case "CLEAR_FAVORITES":
      return {
        ...state,
        favoriteSpotIds: [],
        lastAction: null,
      };

    case "SYNC_EXTERNAL": {
      const syncedState = recoverPersistedWanderState(
        event.persistedState,
        context.spotIds,
        random,
      );

      // An action originating in another tab is not safely undoable here. Its
      // assumptions may already have been superseded in the source tab.
      return {
        ...syncedState,
        lastAction: null,
      };
    }
  }
}

export function createWanderReducer(
  context: WanderReducerContext,
): (state: PersistedWanderMatchState, event: WanderEvent) => PersistedWanderMatchState {
  return (state, event) => reduceWanderState(state, event, context);
}

function commitCurrentSpot(
  state: PersistedWanderMatchState,
  action: LastDiscoverAction["action"],
  spotIds: readonly string[],
  random: RandomSource,
): PersistedWanderMatchState {
  const currentSpotId = selectCurrentSpotId(state);

  if (currentSpotId === null) {
    return state;
  }

  const currentSpotIdSet = new Set(spotIds);

  if (!currentSpotIdSet.has(currentSpotId)) {
    return state;
  }

  const wasFavoriteBefore = state.favoriteSpotIds.includes(currentSpotId);
  const favoriteSpotIds = applyFavoriteAction(
    state.favoriteSpotIds,
    currentSpotId,
    action,
  );
  const viewedSpotIds = appendUnique(state.viewedSpotIds, currentSpotId);
  const isCycleBoundary = state.currentIndex === state.deckSpotIds.length - 1;

  if (!isCycleBoundary) {
    return {
      ...state,
      currentIndex: state.currentIndex + 1,
      viewedSpotIds,
      favoriteSpotIds,
      lastAction: {
        spotId: currentSpotId,
        action,
        wasFavoriteBefore,
        previousIndex: state.currentIndex,
      },
    };
  }

  const nextDeck = createShuffledDeck(spotIds, random);

  return {
    ...state,
    deckSpotIds: nextDeck,
    currentIndex: 0,
    viewedSpotIds: [],
    favoriteSpotIds,
    lastAction: {
      spotId: currentSpotId,
      action,
      wasFavoriteBefore,
      previousIndex: state.currentIndex,
      cycleBoundarySnapshot: {
        deckSpotIds: [...state.deckSpotIds],
        currentIndex: state.currentIndex,
        viewedSpotIds: [...state.viewedSpotIds],
      },
    },
  };
}

function undoLastAction(state: PersistedWanderMatchState): PersistedWanderMatchState {
  const lastAction = state.lastAction;

  if (lastAction === null) {
    return state;
  }

  const favoriteSpotIds = undoFavoriteChange(state.favoriteSpotIds, lastAction);
  const boundarySnapshot = lastAction.cycleBoundarySnapshot;

  if (boundarySnapshot !== undefined) {
    return {
      ...state,
      deckSpotIds: [...boundarySnapshot.deckSpotIds],
      currentIndex: boundarySnapshot.currentIndex,
      viewedSpotIds: [...boundarySnapshot.viewedSpotIds],
      favoriteSpotIds,
      lastAction: null,
    };
  }

  return {
    ...state,
    currentIndex: lastAction.previousIndex,
    viewedSpotIds: state.viewedSpotIds.filter((spotId) => spotId !== lastAction.spotId),
    favoriteSpotIds,
    lastAction: null,
  };
}

function toggleFavorite(
  state: PersistedWanderMatchState,
  spotId: string,
  currentSpotIds: readonly string[],
): PersistedWanderMatchState {
  if (!currentSpotIds.includes(spotId)) {
    return state;
  }

  const isFavorite = state.favoriteSpotIds.includes(spotId);
  let favoriteSpotIds: string[];

  if (isFavorite) {
    favoriteSpotIds = state.favoriteSpotIds.filter((favoriteSpotId) => favoriteSpotId !== spotId);
  } else {
    favoriteSpotIds = [...state.favoriteSpotIds, spotId];
  }

  let lastAction = state.lastAction;

  // Toggling the same spot changes the fact captured by wasFavoriteBefore, so
  // retaining Undo could erase a newer explicit choice made from Detail or Map.
  if (lastAction?.spotId === spotId) {
    lastAction = null;
  }

  return {
    ...state,
    favoriteSpotIds,
    lastAction,
  };
}

function resetHistory(
  state: PersistedWanderMatchState,
  spotIds: readonly string[],
  random: RandomSource,
): PersistedWanderMatchState {
  const currentSpotIds = getUniqueSpotIds(spotIds);
  const currentSpotIdSet = new Set(currentSpotIds);
  const favoriteSpotIds = state.favoriteSpotIds.filter((spotId) => currentSpotIdSet.has(spotId));

  return {
    ...state,
    deckSpotIds: createShuffledDeck(currentSpotIds, random),
    currentIndex: 0,
    viewedSpotIds: [],
    favoriteSpotIds,
    lastAction: null,
  };
}

function applyFavoriteAction(
  favoriteSpotIds: readonly string[],
  spotId: string,
  action: LastDiscoverAction["action"],
): string[] {
  if (action === "skip" || favoriteSpotIds.includes(spotId)) {
    return [...favoriteSpotIds];
  }

  return [...favoriteSpotIds, spotId];
}

function undoFavoriteChange(
  favoriteSpotIds: readonly string[],
  lastAction: LastDiscoverAction,
): string[] {
  if (lastAction.action !== "favorite" || lastAction.wasFavoriteBefore) {
    return [...favoriteSpotIds];
  }

  return favoriteSpotIds.filter((spotId) => spotId !== lastAction.spotId);
}

function appendUnique(spotIds: readonly string[], spotId: string): string[] {
  if (spotIds.includes(spotId)) {
    return [...spotIds];
  }

  return [...spotIds, spotId];
}
