import { describe, expect, it } from "vitest";
import {
  createShuffledDeck,
  fisherYatesShuffle,
  getUniqueSpotIds,
} from "@/domain/wander/deck";

describe("fisherYatesShuffle", () => {
  it("returns a complete permutation without mutating the input", () => {
    const original = ["a", "b", "c", "d"];
    const shuffled = fisherYatesShuffle(original, () => 0);

    expect(shuffled).toHaveLength(original.length);
    expect(new Set(shuffled)).toEqual(new Set(original));
    expect(shuffled).not.toEqual(original);
    expect(original).toEqual(["a", "b", "c", "d"]);
  });

  it("rejects an invalid random source instead of creating a biased deck", () => {
    expect(() => fisherYatesShuffle(["a", "b"], () => 1)).toThrow(RangeError);
  });
});

describe("deck helpers", () => {
  it("keeps the first occurrence of each spot id", () => {
    expect(getUniqueSpotIds(["a", "b", "a", "c"])).toEqual(["a", "b", "c"]);
  });

  it("creates a deck containing each spot once", () => {
    const deck = createShuffledDeck(["a", "b", "a", "c"], () => 0.5);
    expect(new Set(deck)).toEqual(new Set(["a", "b", "c"]));
    expect(deck).toHaveLength(3);
  });
});
