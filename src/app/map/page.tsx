import type { Metadata } from "next";
import { MapExplorer } from "@/components/map/MapExplorer";
import { getMapSummaries } from "@/domain/spots/repository";

export const metadata: Metadata = {
  title: "Map",
  description: "WanderMatchの観光地とお気に入りを世界地図で確認できます。",
};

export default function MapPage() {
  const spots = getMapSummaries();

  return (
    <div className="map-page">
      <MapExplorer spots={spots} />
    </div>
  );
}
