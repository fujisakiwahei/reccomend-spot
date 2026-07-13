import type { ImageCredit } from "@/domain/spots/types";
import { ExternalLink } from "@/components/shared/ExternalLink";

type ImageCreditListProps = {
  images: readonly ImageCredit[];
};

export function ImageCreditList({ images }: ImageCreditListProps) {
  return (
    <ul className="credit-list">
      {images.map((image) => (
        <li key={image.sourceUrl}>
          <span>
            撮影: {image.author} · {image.licenseName}
          </span>{" "}
          <ExternalLink href={image.sourceUrl}>画像の出典</ExternalLink>{" "}
          <ExternalLink href={image.licenseUrl}>ライセンス</ExternalLink>
        </li>
      ))}
    </ul>
  );
}
