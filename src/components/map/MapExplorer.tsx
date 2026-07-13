"use client";

import { useMemo, useState } from "react";
import type { MapSpotSummary } from "@/domain/spots/dto";
import { useWanderState } from "@/providers/WanderStateProvider";
import { MapLoader } from "./MapLoader.client";

type MapMode = "all" | "favorites";

type MapExplorerProps = {
  spots: readonly MapSpotSummary[];
};

export function MapExplorer({ spots }: MapExplorerProps) {
  const [mode, setMode] = useState<MapMode>("all");
  const { state, isHydrated } = useWanderState();
  const favoriteSpotIdSet = useMemo(
    () => new Set(state.favoriteSpotIds),
    [state.favoriteSpotIds],
  );
  const visibleSpots = useMemo(() => {
    if (mode === "all") {
      return spots;
    }

    return spots.filter((spot) => favoriteSpotIdSet.has(spot.id));
  }, [favoriteSpotIdSet, mode, spots]);

  return (
    <section className="map-shell" aria-label="観光地マップ">
      <div className="segmented-control" aria-label="地図に表示する観光地">
        <button
          type="button"
          aria-pressed={mode === "all"}
          onClick={() => setMode("all")}
        >
          すべて ({spots.length})
        </button>
        <button
          type="button"
          aria-pressed={mode === "favorites"}
          onClick={() => setMode("favorites")}
        >
          お気に入り ({state.favoriteSpotIds.length})
        </button>
      </div>
      <div className="map-frame">
        {!isHydrated ? (
          <div className="leaflet-map map-loading" aria-live="polite">
            端末内のお気に入りを読み込んでいます…
          </div>
        ) : (
          <MapLoader
            spots={visibleSpots}
            favoriteSpotIds={state.favoriteSpotIds}
          />
        )}
        {isHydrated && mode === "favorites" && visibleSpots.length === 0 ? (
          <div className="map-empty" role="status">
            まだお気に入りがありません。Discoverで気になる場所を右へスワイプしてみましょう。
          </div>
        ) : null}
      </div>
    </section>
  );
}
