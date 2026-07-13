import {
  WANDER_STORAGE_KEY,
  WANDER_STORAGE_PROBE_KEY,
} from "@/config/storage";
import type { PersistedWanderMatchState } from "@/domain/wander/types";

export type StorageReadResult = {
  value: unknown;
  isAvailable: boolean;
};

export function readWanderStateFromStorage(): StorageReadResult {
  try {
    window.localStorage.setItem(WANDER_STORAGE_PROBE_KEY, "1");
    window.localStorage.removeItem(WANDER_STORAGE_PROBE_KEY);

    const serializedState = window.localStorage.getItem(WANDER_STORAGE_KEY);

    if (serializedState === null) {
      return { value: null, isAvailable: true };
    }

    try {
      return {
        value: JSON.parse(serializedState) as unknown,
        isAvailable: true,
      };
    } catch {
      return { value: null, isAvailable: true };
    }
  } catch {
    return { value: null, isAvailable: false };
  }
}

export function writeWanderStateToStorage(
  state: PersistedWanderMatchState,
): boolean {
  try {
    window.localStorage.setItem(WANDER_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function parseStorageEventValue(serializedState: string | null): unknown {
  if (serializedState === null) {
    return null;
  }

  try {
    return JSON.parse(serializedState) as unknown;
  } catch {
    return null;
  }
}
