import { describe, expect, it } from "vitest";
import {
  getAllSpots,
  getCardSummaries,
  getMapSummaries,
  getSpotBySlug,
  getSpotIds,
} from "@/domain/spots/repository";
import { REGIONS } from "@/domain/spots/types";

describe("sample spot dataset", () => {
  it("loads the manifest-defined ten spots from all seven regions", () => {
    const spots = getAllSpots();
    const regions = new Set(spots.map((spot) => spot.region));

    expect(spots).toHaveLength(10);
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

  it("creates only the DTO data needed by Discover and Map", () => {
    expect(getSpotIds()).toHaveLength(10);
    expect(getCardSummaries()).toHaveLength(10);
    expect(getMapSummaries()).toHaveLength(10);
    expect(getCardSummaries()[0]).not.toHaveProperty("sources");
    expect(getMapSummaries()[0]).not.toHaveProperty("accessFromTokyo");
  });
});
