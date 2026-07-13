"use client";

import Image from "next/image";
import { useState } from "react";
import type { ImageCredit } from "@/domain/spots/types";

const FALLBACK_IMAGE_URL = "/images/spot-fallback.svg";

type SpotImageProps = {
  image: ImageCredit;
  sizes: string;
  eager?: boolean;
};

export function SpotImage({ image, sizes, eager = false }: SpotImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = failedSource === image.url ? FALLBACK_IMAGE_URL : image.url;

  return (
    <Image
      fill
      src={source}
      alt={image.alt}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      onError={() => {
        if (source !== FALLBACK_IMAGE_URL) {
          setFailedSource(image.url);
        }
      }}
    />
  );
}
