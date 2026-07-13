import { DiscoverClient } from "@/components/discover/DiscoverClient";
import { getCardSummaries } from "@/domain/spots/repository";

export default function DiscoverPage() {
  const spots = getCardSummaries();

  return (
    <div className="discover-page">
      <div className="discover-layout">
        <section className="discover-stage" aria-label="観光地を見つける">
          <DiscoverClient spots={spots} />
        </section>
      </div>
    </div>
  );
}
