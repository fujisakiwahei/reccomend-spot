import { describe, expect, it } from "vitest";
import datasetManifest from "../../data/dataset-manifest.json";
import researchProgress from "../../data/research-progress.json";
import {
  getAllSpots,
  getCardSummaries,
  getMapSummaries,
  getSpotBySlug,
  getSpotIds,
} from "@/domain/spots/repository";
import { REGIONS } from "@/domain/spots/types";

const RELEASE_REGION_COUNTS = {
  asia: 30,
  europe: 50,
  "north-america": 30,
  "latin-america": 30,
  africa: 20,
  "middle-east-central-asia": 20,
  oceania: 20,
} as const;

describe("release spot dataset", () => {
  it("loads all 200 spots with the fixed release region allocation", () => {
    const spots = getAllSpots();
    const regions = new Set(spots.map((spot) => spot.region));
    const actualRegionCounts = Object.fromEntries(
      REGIONS.map((region) => [
        region,
        spots.filter((spot) => spot.region === region).length,
      ]),
    );

    expect(datasetManifest.datasetStage).toBe("release");
    expect(datasetManifest.expectedTotal).toBe(200);
    expect(datasetManifest.expectedRegionCounts).toEqual(RELEASE_REGION_COUNTS);
    expect(spots).toHaveLength(200);
    expect(actualRegionCounts).toEqual(RELEASE_REGION_COUNTS);
    expect(regions).toEqual(new Set(REGIONS));
  });

  it("keeps ids and slugs globally unique", () => {
    const spots = getAllSpots();

    expect(new Set(spots.map((spot) => spot.id)).size).toBe(spots.length);
    expect(new Set(spots.map((spot) => spot.slug)).size).toBe(spots.length);
  });

  it("resolves every static Detail route", () => {
    for (const spot of getAllSpots()) {
      expect(getSpotBySlug(spot.slug)?.id).toBe(spot.id);
    }

    expect(getSpotBySlug("unknown-spot")).toBeNull();
  });

  it("records every release spot exactly once in validated research batches", () => {
    const spotsById = new Map(getAllSpots().map((spot) => [spot.id, spot]));
    const recordedSpotIds = researchProgress.batches.flatMap((batch) => {
      expect(batch.status).toBe("validated");

      for (const spotId of batch.spotIds) {
        expect(spotsById.get(spotId)?.region).toBe(batch.region);
      }

      return batch.spotIds;
    });

    expect(recordedSpotIds).toHaveLength(200);
    expect(new Set(recordedSpotIds).size).toBe(200);
    expect(new Set(recordedSpotIds)).toEqual(new Set(getSpotIds()));
  });

  it("keeps a checked transport source for every release spot", () => {
    for (const spot of getAllSpots()) {
      expect(
        spot.sources.some((source) => source.type === "transport"),
        `${spot.id} is missing a transport source`,
      ).toBe(true);
    }
  });

  it("creates only the DTO data needed by Discover and Map", () => {
    expect(getSpotIds()).toHaveLength(datasetManifest.expectedTotal);
    expect(getCardSummaries()).toHaveLength(datasetManifest.expectedTotal);
    expect(getMapSummaries()).toHaveLength(datasetManifest.expectedTotal);
    expect(getCardSummaries()[0]).not.toHaveProperty("sources");
    expect(getMapSummaries()[0]).not.toHaveProperty("accessFromTokyo");
  });
});
