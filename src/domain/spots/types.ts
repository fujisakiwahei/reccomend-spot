export const REGIONS = [
  "asia",
  "europe",
  "north-america",
  "latin-america",
  "africa",
  "middle-east-central-asia",
  "oceania",
] as const;

export type Region = (typeof REGIONS)[number];

export const CATEGORIES = [
  "自然・絶景",
  "歴史・遺跡",
  "建築・街並み",
  "アート・文化",
  "ビーチ・リゾート",
  "アクティビティ",
  "グルメ・市場",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const RESEARCH_SOURCE_TYPES = [
  "official",
  "wikipedia",
  "transport",
  "other",
] as const;

export type ResearchSourceType = (typeof RESEARCH_SOURCE_TYPES)[number];

export type DatasetStage = "sample" | "release";

export interface ImageCredit {
  readonly url: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly author: string;
  readonly licenseName: string;
  readonly licenseUrl: string;
  readonly sourceUrl: string;
}

export interface ResearchSource {
  readonly title: string;
  readonly url: string;
  readonly type: ResearchSourceType;
  readonly checkedAt: string;
}

export interface SpotCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface AccessFromTokyo {
  readonly departureAirport: "羽田空港" | "成田空港";
  readonly arrivalGateway: string;
  readonly routeSummary: string;
  readonly estimatedDuration: string;
  readonly transferCount: number | null;
  readonly localTransport: string;
  readonly note: string;
}

export interface Spot {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly internalEnglishName?: string;
  readonly region: Region;
  readonly country: string;
  readonly city: string;
  readonly categories: readonly Category[];
  readonly description: string;
  readonly coordinates: SpotCoordinates;
  readonly googleMapsUrl: string;
  readonly accessFromTokyo: AccessFromTokyo;
  readonly mainImage: ImageCredit;
  readonly additionalImages: readonly ImageCredit[];
  readonly sources: readonly ResearchSource[];
  readonly lastVerifiedAt: string;
}

export interface RegionalSpotFile {
  readonly schemaVersion: number;
  readonly spots: readonly Spot[];
}

export interface SpotDatasetManifest {
  readonly schemaVersion: number;
  readonly datasetStage: DatasetStage;
  readonly expectedTotal: number;
  readonly expectedRegionCounts: Readonly<Record<Region, number>>;
  readonly lastUpdatedAt?: string;
}

export interface CountryLimitException {
  readonly country: string;
  readonly allowedCount: number;
  readonly reason: string;
}

export interface CountryLimitExceptionsFile {
  readonly schemaVersion: number;
  readonly exceptions: readonly CountryLimitException[];
}

export interface DatasetValidationProfile {
  readonly stage: DatasetStage;
  readonly countryLimitExceptions: unknown;
}

export interface SpotDatasetValidationResult {
  readonly isValid: boolean;
  readonly spots: readonly Spot[];
  readonly errors: readonly string[];
}

export type RegionalSpotFiles = Readonly<Partial<Record<Region, unknown>>>;
