"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { WANDER_STORAGE_KEY } from "@/config/storage";
import { createWanderReducer } from "@/domain/wander/reducer";
import {
  WANDER_STATE_VERSION,
  type DiscoverAction,
  type PersistedWanderMatchState,
} from "@/domain/wander/types";
import {
  parseStorageEventValue,
  readWanderStateFromStorage,
  writeWanderStateToStorage,
} from "@/infrastructure/storage/wander-storage.client";

type WanderContextValue = {
  state: PersistedWanderMatchState;
  isHydrated: boolean;
  isPersistent: boolean;
  commitCurrent: (action: DiscoverAction) => void;
  undoLast: () => void;
  toggleFavorite: (spotId: string) => void;
  resetHistory: () => void;
  clearFavorites: () => void;
};

const WanderStateContext = createContext<WanderContextValue | null>(null);

type WanderStateProviderProps = {
  spotIds: readonly string[];
  children: ReactNode;
};

export function WanderStateProvider({
  spotIds,
  children,
}: WanderStateProviderProps) {
  const reducer = useMemo(() => createWanderReducer({ spotIds }), [spotIds]);
  const [state, dispatch] = useReducer(reducer, spotIds, createDeterministicInitialState);
  const [storageStatus, dispatchStorageStatus] = useReducer(storageStatusReducer, {
    isHydrated: false,
    isPersistent: true,
  });
  const { isHydrated, isPersistent } = storageStatus;

  useEffect(() => {
    const storedState = readWanderStateFromStorage();
    dispatch({ type: "HYDRATE", persistedState: storedState.value });
    dispatchStorageStatus({
      type: "HYDRATED",
      isPersistent: storedState.isAvailable,
    });
  }, []);

  useEffect(() => {
    if (!isHydrated || !isPersistent) {
      return;
    }

    const writeSucceeded = writeWanderStateToStorage(state);

    if (!writeSucceeded) {
      dispatchStorageStatus({ type: "STORAGE_FAILED" });
    }
  }, [isHydrated, isPersistent, state]);

  useEffect(() => {
    function synchronizeFromAnotherTab(event: StorageEvent) {
      if (event.key !== WANDER_STORAGE_KEY) {
        return;
      }

      dispatch({
        type: "SYNC_EXTERNAL",
        persistedState: parseStorageEventValue(event.newValue),
      });
    }

    window.addEventListener("storage", synchronizeFromAnotherTab);
    return () => window.removeEventListener("storage", synchronizeFromAnotherTab);
  }, []);

  const commitCurrent = useCallback((action: DiscoverAction) => {
    dispatch({ type: "COMMIT_CURRENT", action });
  }, []);

  const undoLast = useCallback(() => {
    dispatch({ type: "UNDO_LAST" });
  }, []);

  const toggleFavorite = useCallback((spotId: string) => {
    dispatch({ type: "TOGGLE_FAVORITE", spotId });
  }, []);

  const resetHistory = useCallback(() => {
    dispatch({ type: "RESET_HISTORY" });
  }, []);

  const clearFavorites = useCallback(() => {
    dispatch({ type: "CLEAR_FAVORITES" });
  }, []);

  const contextValue = useMemo<WanderContextValue>(
    () => ({
      state,
      isHydrated,
      isPersistent,
      commitCurrent,
      undoLast,
      toggleFavorite,
      resetHistory,
      clearFavorites,
    }),
    [
      state,
      isHydrated,
      isPersistent,
      commitCurrent,
      undoLast,
      toggleFavorite,
      resetHistory,
      clearFavorites,
    ],
  );

  return (
    <WanderStateContext.Provider value={contextValue}>
      {children}
    </WanderStateContext.Provider>
  );
}

export function useWanderState(): WanderContextValue {
  const context = useContext(WanderStateContext);

  if (context === null) {
    throw new Error("useWanderState must be used within WanderStateProvider.");
  }

  return context;
}

function createDeterministicInitialState(
  spotIds: readonly string[],
): PersistedWanderMatchState {
  return {
    version: WANDER_STATE_VERSION,
    deckSpotIds: [...spotIds],
    currentIndex: 0,
    viewedSpotIds: [],
    favoriteSpotIds: [],
    lastAction: null,
  };
}

type StorageStatus = {
  isHydrated: boolean;
  isPersistent: boolean;
};

type StorageStatusEvent =
  | { type: "HYDRATED"; isPersistent: boolean }
  | { type: "STORAGE_FAILED" };

function storageStatusReducer(
  status: StorageStatus,
  event: StorageStatusEvent,
): StorageStatus {
  if (event.type === "HYDRATED") {
    return {
      isHydrated: true,
      isPersistent: event.isPersistent,
    };
  }

  return {
    ...status,
    isPersistent: false,
  };
}
