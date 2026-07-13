export const WANDER_STATE_VERSION = 1 as const;

export type RandomSource = () => number;

export type DiscoverAction = "skip" | "favorite";

export type CycleBoundarySnapshot = {
  deckSpotIds: string[];
  currentIndex: number;
  viewedSpotIds: string[];
};

export type LastDiscoverAction = {
  spotId: string;
  action: DiscoverAction;
  wasFavoriteBefore: boolean;
  previousIndex: number;
  cycleBoundarySnapshot?: CycleBoundarySnapshot;
};

export type PersistedWanderMatchState = {
  version: typeof WANDER_STATE_VERSION;
  deckSpotIds: string[];
  currentIndex: number;
  viewedSpotIds: string[];
  favoriteSpotIds: string[];
  lastAction: LastDiscoverAction | null;
};

export type WanderEvent =
  | {
      type: "HYDRATE";
      persistedState: unknown;
    }
  | {
      type: "COMMIT_CURRENT";
      action: DiscoverAction;
    }
  | {
      type: "UNDO_LAST";
    }
  | {
      type: "TOGGLE_FAVORITE";
      spotId: string;
    }
  | {
      type: "RESET_HISTORY";
    }
  | {
      type: "CLEAR_FAVORITES";
    }
  | {
      type: "SYNC_EXTERNAL";
      persistedState: unknown;
    };

export type WanderReducerContext = {
  spotIds: readonly string[];
  random?: RandomSource;
};
