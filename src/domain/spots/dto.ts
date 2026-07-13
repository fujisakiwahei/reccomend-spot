import type { Category, ImageCredit, Region, Spot, SpotCoordinates } from "./types";

export interface SpotCardSummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly region: Region;
  readonly country: string;
  readonly city: string;
  readonly categories: readonly Category[];
  readonly description: string;
  readonly mainImage: ImageCredit;
}

export interface MapSpotSummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly region: Region;
  readonly country: string;
  readonly city: string;
  readonly categories: readonly Category[];
  readonly coordinates: SpotCoordinates;
  readonly mainImage: ImageCredit;
}

export function toSpotCardSummary(spot: Spot): SpotCardSummary {
  return {
    id: spot.id,
    slug: spot.slug,
    name: spot.name,
    region: spot.region,
    country: spot.country,
    city: spot.city,
    categories: spot.categories,
    description: spot.description,
    mainImage: spot.mainImage,
  };
}

export function toMapSpotSummary(spot: Spot): MapSpotSummary {
  return {
    id: spot.id,
    slug: spot.slug,
    name: spot.name,
    region: spot.region,
    country: spot.country,
    city: spot.city,
    categories: spot.categories,
    coordinates: spot.coordinates,
    mainImage: spot.mainImage,
  };
}
