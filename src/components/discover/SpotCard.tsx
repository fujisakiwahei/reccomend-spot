import type { PointerEventHandler } from "react";
import type { SpotCardSummary } from "@/domain/spots/dto";
import { SpotImage } from "@/components/shared/SpotImage";

export const SPOT_CARD_IMAGE_SIZES =
  "(min-width: 768px) 30rem, min(calc(100vw - 2rem), calc(100dvh - 11.75rem))";

type SpotCardProps = {
  spot: SpotCardSummary;
  dragClass: string;
  dragDirection: "left" | "right" | null;
  exitDirection: "left" | "right" | "up" | null;
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
};

export function SpotCard({
  spot,
  dragClass,
  dragDirection,
  exitDirection,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: SpotCardProps) {
  const classNames = ["spot-card", dragClass];

  if (exitDirection !== null) {
    classNames.push(`is-exiting-${exitDirection}`);
  }

  return (
    <article
      className={classNames.filter(Boolean).join(" ")}
      data-drag-direction={dragDirection ?? undefined}
      aria-label={`${spot.name}のカード。タップで詳細を表示`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="spot-card__image">
        <SpotImage
          image={spot.mainImage}
          sizes={SPOT_CARD_IMAGE_SIZES}
          eager
        />
        <span className="swipe-stamp swipe-stamp--save" aria-hidden="true">
          保存
        </span>
        <span className="swipe-stamp swipe-stamp--skip" aria-hidden="true">
          スキップ
        </span>
      </div>
      <div className="spot-card__body">
        <p className="spot-card__location">
          {spot.country} · {spot.city}
        </p>
        <h2>{spot.name}</h2>
        <p className="spot-card__description">{spot.description}</p>
        <div className="category-list" aria-label="カテゴリ">
          {spot.categories.map((category) => (
            <span key={category} className="category-chip">
              {category}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
