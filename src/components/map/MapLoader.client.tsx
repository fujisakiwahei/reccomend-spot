"use client";

import dynamic from "next/dynamic";
import type { MapSpotSummary } from "@/domain/spots/dto";

const LeafletMap = dynamic(
  () => import("./LeafletMap.client").then((module) => module.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="leaflet-map map-loading" aria-live="polite">
        世界地図を読み込んでいます…
      </div>
    ),
  },
);

type MapLoaderProps = {
  spots: readonly MapSpotSummary[];
  favoriteSpotIds: readonly string[];
};

export function MapLoader({ spots, favoriteSpotIds }: MapLoaderProps) {
  return <LeafletMap spots={spots} favoriteSpotIds={favoriteSpotIds} />;
}
