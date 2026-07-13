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
      <header className="page-heading">
        <p className="eyebrow">SEE THE WHOLE WORLD</p>
        <h1>お気に入りを、世界に並べる。</h1>
        <p>ピンを選ぶと観光地の概要を確認できます。近い場所は件数ごとにまとまります。</p>
      </header>
      <MapExplorer spots={spots} />
    </div>
  );
}
