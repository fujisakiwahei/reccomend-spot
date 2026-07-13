import type { Spot } from "@/domain/spots/types";
import { ExternalLink } from "@/components/shared/ExternalLink";
import { SpotImage } from "@/components/shared/SpotImage";
import { DetailBackButton } from "./DetailBackButton";
import { FavoriteToggle } from "./FavoriteToggle";
import { ImageCreditList } from "./ImageCreditList";

type SpotDetailProps = {
  spot: Spot;
};

export function SpotDetail({ spot }: SpotDetailProps) {
  const creditedImages = [spot.mainImage, ...spot.additionalImages];

  return (
    <article className="detail-article">
      <DetailBackButton slug={spot.slug} />

      <div className="detail-hero">
        <header className="detail-hero__copy">
          <p className="eyebrow">{spot.region.replaceAll("-", " ").toUpperCase()}</p>
          <h1>{spot.name}</h1>
          <p className="detail-location">
            {spot.country} · {spot.city}
          </p>
          <div className="category-list" aria-label="カテゴリ">
            {spot.categories.map((category) => (
              <span key={category} className="category-chip">
                {category}
              </span>
            ))}
          </div>
          <FavoriteToggle spotId={spot.id} />
        </header>

        <figure className="spot-image">
          <SpotImage
            image={spot.mainImage}
            sizes="(min-width: 768px) 60vw, calc(100vw - 2rem)"
            eager
          />
        </figure>
      </div>

      {spot.additionalImages.length > 0 ? (
        <section className="additional-images" aria-label={`${spot.name}の追加写真`}>
          {spot.additionalImages.map((image) => (
            <figure key={image.sourceUrl} className="additional-images__item">
              <SpotImage image={image} sizes="(min-width: 768px) 33vw, 100vw" />
            </figure>
          ))}
        </section>
      ) : null}

      <div className="detail-grid">
        <section className="detail-panel">
          <h2>この場所について</h2>
          <p>{spot.description}</p>
        </section>

        <section className="detail-panel">
          <h2>東京からのアクセス</h2>
          <p className="access-route">{spot.accessFromTokyo.routeSummary}</p>
          <dl className="access-details">
            <div>
              <dt>所要時間の目安</dt>
              <dd>{spot.accessFromTokyo.estimatedDuration}</dd>
            </div>
            <div>
              <dt>航空乗り継ぎ</dt>
              <dd>{formatTransferCount(spot.accessFromTokyo.transferCount)}</dd>
            </div>
            <div>
              <dt>現地交通</dt>
              <dd>{spot.accessFromTokyo.localTransport}</dd>
            </div>
          </dl>
          <p className="transport-note">
            {spot.accessFromTokyo.note}
            <br />
            運航状況や所要時間は変動します。予約前に交通事業者の最新情報をご確認ください。
          </p>
        </section>

        <section className="detail-panel detail-panel--wide">
          <h2>地図と情報元</h2>
          <ExternalLink href={spot.googleMapsUrl}>Google Mapsで場所を見る</ExternalLink>
          <ul className="source-list">
            {spot.sources.map((source) => (
              <li key={source.url}>
                <ExternalLink href={source.url}>{source.title}</ExternalLink>
                <span> · 確認日 {source.checkedAt}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="detail-panel detail-panel--wide">
          <h2>画像クレジット</h2>
          <ImageCreditList images={creditedImages} />
        </section>

        <footer className="detail-panel detail-panel--wide">
          <p>
            情報の最終確認日: <time dateTime={spot.lastVerifiedAt}>{spot.lastVerifiedAt}</time>
          </p>
          <p>
            このページは旅程の目安です。交通、入場条件、現地ルールは変更されるため、出発前に公式情報をご確認ください。
          </p>
        </footer>
      </div>
    </article>
  );
}

function formatTransferCount(transferCount: number | null): string {
  if (transferCount === null) {
    return "経路により異なる";
  }

  if (transferCount === 0) {
    return "直行便の代表経路";
  }

  return `${transferCount}回`;
}
