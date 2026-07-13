import africaFile from "../../../data/spots/africa.json";
import asiaFile from "../../../data/spots/asia.json";
import europeFile from "../../../data/spots/europe.json";
import latinAmericaFile from "../../../data/spots/latin-america.json";
import middleEastCentralAsiaFile from "../../../data/spots/middle-east-central-asia.json";
import northAmericaFile from "../../../data/spots/north-america.json";
import oceaniaFile from "../../../data/spots/oceania.json";
import countryLimitExceptions from "../../../data/country-limit-exceptions.json";
import datasetManifest from "../../../data/dataset-manifest.json";

import { toMapSpotSummary, toSpotCardSummary, type MapSpotSummary, type SpotCardSummary } from "./dto";
import { validateSpotDataset } from "./schema";
import type { DatasetStage, DatasetValidationProfile, Region, Spot } from "./types";

const REGIONAL_FILES: Readonly<Record<Region, unknown>> = {
  asia: asiaFile,
  europe: europeFile,
  "north-america": northAmericaFile,
  "latin-america": latinAmericaFile,
  africa: africaFile,
  "middle-east-central-asia": middleEastCentralAsiaFile,
  oceania: oceaniaFile,
};

const validationProfile: DatasetValidationProfile = {
  stage: readDatasetStage(datasetManifest),
  countryLimitExceptions,
};

const validationResult = validateSpotDataset(
  REGIONAL_FILES,
  datasetManifest,
  validationProfile,
);

if (!validationResult.isValid) {
  throw new Error(
    ["観光地データの検証に失敗しました:", ...validationResult.errors.map((error) => `- ${error}`)].join(
      "\n",
    ),
  );
}

const ALL_SPOTS = validationResult.spots;
const SPOTS_BY_SLUG = new Map(ALL_SPOTS.map((spot) => [spot.slug, spot]));
const CARD_SUMMARIES = ALL_SPOTS.map(toSpotCardSummary);
const MAP_SUMMARIES = ALL_SPOTS.map(toMapSpotSummary);
const SPOT_IDS = ALL_SPOTS.map((spot) => spot.id);

export function getAllSpots(): readonly Spot[] {
  return ALL_SPOTS;
}

export function getSpotBySlug(slug: string): Spot | null {
  return SPOTS_BY_SLUG.get(slug) ?? null;
}

export function getCardSummaries(): readonly SpotCardSummary[] {
  return CARD_SUMMARIES;
}

export function getMapSummaries(): readonly MapSpotSummary[] {
  return MAP_SUMMARIES;
}

export function getSpotIds(): readonly string[] {
  return SPOT_IDS;
}

function readDatasetStage(value: unknown): DatasetStage {
  if (
    typeof value === "object" &&
    value !== null &&
    "datasetStage" in value &&
    value.datasetStage === "release"
  ) {
    return "release";
  }

  return "sample";
}
