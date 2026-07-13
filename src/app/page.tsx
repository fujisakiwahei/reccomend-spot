import { DiscoverClient } from "@/components/discover/DiscoverClient";
import { getCardSummaries } from "@/domain/spots/repository";

export default function DiscoverPage() {
  const spots = getCardSummaries();

  return (
    <div className="discover-page">
      <div className="discover-layout">
        <header className="discover-heading">
          <p className="eyebrow">DON&apos;T SEARCH. DISCOVER.</p>
          <h1>次の旅先は、偶然にまかせよう。</h1>
          <p>
            世界の観光地を1枚ずつ。左右へ振り分け、上へ送ると詳しいアクセスを確認できます。
          </p>
        </header>
        <section className="discover-stage" aria-label="観光地を見つける">
          <DiscoverClient spots={spots} />
        </section>
      </div>
    </div>
  );
}
