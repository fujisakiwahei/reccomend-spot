import { createShuffledDeck, getUniqueSpotIds } from "./deck";
import {
  WANDER_STATE_VERSION,
  type CycleBoundarySnapshot,
  type LastDiscoverAction,
  type PersistedWanderMatchState,
  type RandomSource,
} from "./types";

type UnknownRecord = Record<string, unknown>;

export function createInitialWanderState(
  spotIds: readonly string[],
  random: RandomSource = Math.random,
  favoriteSpotIds: readonly string[] = [],
): PersistedWanderMatchState {
  const currentSpotIds = getUniqueSpotIds(spotIds);
  const currentSpotIdSet = new Set(currentSpotIds);

  return {
    version: WANDER_STATE_VERSION,
    deckSpotIds: createShuffledDeck(currentSpotIds, random),
    currentIndex: 0,
    viewedSpotIds: [],
    favoriteSpotIds: filterKnownUniqueIds(favoriteSpotIds, currentSpotIdSet),
    lastAction: null,
  };
}

export function recoverPersistedWanderState(
  persistedState: unknown,
  spotIds: readonly string[],
  random: RandomSource = Math.random,
): PersistedWanderMatchState {
  const currentSpotIds = getUniqueSpotIds(spotIds);
  const currentSpotIdSet = new Set(currentSpotIds);
  const recoveredFavorites = recoverFavoriteSpotIds(persistedState, currentSpotIdSet);

  if (currentSpotIds.length === 0) {
    return createInitialWanderState([], random, recoveredFavorites);
  }

  if (!isRecord(persistedState) || persistedState.version !== WANDER_STATE_VERSION) {
    return createInitialWanderState(currentSpotIds, random, recoveredFavorites);
  }

  const storedDeck = readStringArray(persistedState.deckSpotIds);
  const storedIndex = readInteger(persistedState.currentIndex);

  if (storedDeck === null || storedIndex === null || !hasUniqueItems(storedDeck)) {
    return createInitialWanderState(currentSpotIds, random, recoveredFavorites);
  }

  // A previous implementation may have persisted the exhausted index before
  // creating the next cycle. Treat it as a completed cycle instead of a crash.
  if (storedIndex === storedDeck.length) {
    return createInitialWanderState(currentSpotIds, random, recoveredFavorites);
  }

  if (storedIndex < 0 || storedIndex >= storedDeck.length) {
    return createInitialWanderState(currentSpotIds, random, recoveredFavorites);
  }

  const deckRecovery = recoverDeck(
    storedDeck,
    storedIndex,
    currentSpotIds,
    currentSpotIdSet,
    random,
  );

  if (deckRecovery === null) {
    return createInitialWanderState(currentSpotIds, random, recoveredFavorites);
  }

  const storedViewedSpotIds = readStringArray(persistedState.viewedSpotIds);
  const expectedViewedSpotIds = deckRecovery.deckSpotIds.slice(0, deckRecovery.currentIndex);
  const viewedStateWasRepaired =
    storedViewedSpotIds === null || !arraysEqual(storedViewedSpotIds, expectedViewedSpotIds);
  const stateWasRepaired = deckRecovery.datasetChanged || viewedStateWasRepaired;

  const recoveredState: PersistedWanderMatchState = {
    version: WANDER_STATE_VERSION,
    deckSpotIds: deckRecovery.deckSpotIds,
    currentIndex: deckRecovery.currentIndex,
    viewedSpotIds: expectedViewedSpotIds,
    favoriteSpotIds: recoveredFavorites,
    lastAction: null,
  };

  // Undo depends on the exact pre-action deck. Once migration repairs any part
  // of that relationship, discarding Undo is safer than restoring a wrong spot.
  if (!stateWasRepaired) {
    recoveredState.lastAction = recoverLastAction(
      persistedState.lastAction,
      recoveredState,
      currentSpotIdSet,
    );
  }

  return recoveredState;
}

type RecoveredDeck = {
  deckSpotIds: string[];
  currentIndex: number;
  datasetChanged: boolean;
};

function recoverDeck(
  storedDeck: readonly string[],
  storedIndex: number,
  currentSpotIds: readonly string[],
  currentSpotIdSet: ReadonlySet<string>,
  random: RandomSource,
): RecoveredDeck | null {
  const validConsumedSpotIds = storedDeck
    .slice(0, storedIndex)
    .filter((spotId) => currentSpotIdSet.has(spotId));
  const validRemainingSpotIds = storedDeck
    .slice(storedIndex)
    .filter((spotId) => currentSpotIdSet.has(spotId));
  const storedSpotIdSet = new Set(storedDeck);
  const addedSpotIds = currentSpotIds.filter((spotId) => !storedSpotIdSet.has(spotId));
  const removedSpotCount = storedDeck.length - validConsumedSpotIds.length - validRemainingSpotIds.length;
  const datasetChanged = removedSpotCount > 0 || addedSpotIds.length > 0;

  if (validRemainingSpotIds.length === 0 && addedSpotIds.length === 0) {
    return null;
  }

  // Newly added spots go at the end of the active cycle. This preserves the
  // user's existing continuation while still exposing additions before rollover.
  const shuffledAddedSpotIds = createShuffledDeck(addedSpotIds, random);
  const recoveredDeck = [
    ...validConsumedSpotIds,
    ...validRemainingSpotIds,
    ...shuffledAddedSpotIds,
  ];

  if (recoveredDeck.length !== currentSpotIds.length) {
    return null;
  }

  return {
    deckSpotIds: recoveredDeck,
    currentIndex: validConsumedSpotIds.length,
    datasetChanged,
  };
}

function recoverLastAction(
  lastActionValue: unknown,
  state: PersistedWanderMatchState,
  currentSpotIdSet: ReadonlySet<string>,
): LastDiscoverAction | null {
  if (!isRecord(lastActionValue)) {
    return null;
  }

  const spotId = lastActionValue.spotId;
  const action = lastActionValue.action;
  const wasFavoriteBefore = lastActionValue.wasFavoriteBefore;

  if (typeof spotId !== "string" || !currentSpotIdSet.has(spotId)) {
    return null;
  }

  if (action !== "skip" && action !== "favorite") {
    return null;
  }

  if (typeof wasFavoriteBefore !== "boolean") {
    return null;
  }

  if (action === "favorite" && !state.favoriteSpotIds.includes(spotId)) {
    return null;
  }

  const boundarySnapshot = recoverBoundarySnapshot(
    lastActionValue.cycleBoundarySnapshot,
    spotId,
    currentSpotIdSet,
  );

  if (boundarySnapshot !== null) {
    if (state.currentIndex !== 0 || state.viewedSpotIds.length !== 0) {
      return null;
    }

    return {
      spotId,
      action,
      wasFavoriteBefore,
      previousIndex: boundarySnapshot.currentIndex,
      cycleBoundarySnapshot: boundarySnapshot,
    };
  }

  let previousIndex = readInteger(lastActionValue.previousIndex);

  // Version 1 originally specified no previousIndex. It can be derived for
  // ordinary actions, but never for a cycle-boundary action.
  if (previousIndex === null) {
    previousIndex = state.currentIndex - 1;
  }

  if (previousIndex < 0 || previousIndex + 1 !== state.currentIndex) {
    return null;
  }

  if (state.deckSpotIds[previousIndex] !== spotId) {
    return null;
  }

  return {
    spotId,
    action,
    wasFavoriteBefore,
    previousIndex,
  };
}

function recoverBoundarySnapshot(
  snapshotValue: unknown,
  spotId: string,
  currentSpotIdSet: ReadonlySet<string>,
): CycleBoundarySnapshot | null {
  if (!isRecord(snapshotValue)) {
    return null;
  }

  const deckSpotIds = readStringArray(snapshotValue.deckSpotIds);
  const currentIndex = readInteger(snapshotValue.currentIndex);
  const viewedSpotIds = readStringArray(snapshotValue.viewedSpotIds);

  if (deckSpotIds === null || currentIndex === null || viewedSpotIds === null) {
    return null;
  }

  if (!hasUniqueItems(deckSpotIds) || deckSpotIds.length !== currentSpotIdSet.size) {
    return null;
  }

  if (!deckSpotIds.every((deckSpotId) => currentSpotIdSet.has(deckSpotId))) {
    return null;
  }

  if (currentIndex < 0 || currentIndex >= deckSpotIds.length) {
    return null;
  }

  if (deckSpotIds[currentIndex] !== spotId) {
    return null;
  }

  const expectedViewedSpotIds = deckSpotIds.slice(0, currentIndex);

  if (!arraysEqual(viewedSpotIds, expectedViewedSpotIds)) {
    return null;
  }

  return {
    deckSpotIds: [...deckSpotIds],
    currentIndex,
    viewedSpotIds: [...viewedSpotIds],
  };
}

function recoverFavoriteSpotIds(
  persistedState: unknown,
  currentSpotIdSet: ReadonlySet<string>,
): string[] {
  if (!isRecord(persistedState)) {
    return [];
  }

  if (!Array.isArray(persistedState.favoriteSpotIds)) {
    return [];
  }

  // Favorites are independent user choices. A malformed sibling entry should
  // not cause otherwise valid favorites to be discarded during recovery.
  const storedFavorites = persistedState.favoriteSpotIds.filter(
    (spotId): spotId is string => typeof spotId === "string",
  );

  return filterKnownUniqueIds(storedFavorites, currentSpotIdSet);
}

function filterKnownUniqueIds(
  spotIds: readonly string[],
  currentSpotIdSet: ReadonlySet<string>,
): string[] {
  const filteredSpotIds: string[] = [];
  const seenSpotIds = new Set<string>();

  for (const spotId of spotIds) {
    if (!currentSpotIdSet.has(spotId) || seenSpotIds.has(spotId)) {
      continue;
    }

    seenSpotIds.add(spotId);
    filteredSpotIds.push(spotId);
  }

  return filteredSpotIds;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const strings: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      return null;
    }

    strings.push(item);
  }

  return strings;
}

function readInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  return value;
}

function hasUniqueItems(items: readonly string[]): boolean {
  return new Set(items).size === items.length;
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
