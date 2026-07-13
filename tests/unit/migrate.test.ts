import { describe, expect, it } from "vitest";
import { recoverPersistedWanderState } from "@/domain/wander/migrate";

const stableRandom = () => 0.999;

describe("recoverPersistedWanderState", () => {
  it("recovers valid favorites from an unknown version", () => {
    const recovered = recoverPersistedWanderState(
      {
        version: 99,
        favoriteSpotIds: ["b", "missing", "b"],
      },
      ["a", "b"],
      stableRandom,
    );

    expect(recovered.favoriteSpotIds).toEqual(["b"]);
    expect(new Set(recovered.deckSpotIds)).toEqual(new Set(["a", "b"]));
    expect(recovered.currentIndex).toBe(0);
  });

  it("preserves remaining order while removing and appending dataset ids", () => {
    const recovered = recoverPersistedWanderState(
      {
        version: 1,
        deckSpotIds: ["a", "b"],
        currentIndex: 1,
        viewedSpotIds: ["a"],
        favoriteSpotIds: ["b"],
        lastAction: null,
      },
      ["b", "c"],
      stableRandom,
    );

    expect(recovered.deckSpotIds).toEqual(["b", "c"]);
    expect(recovered.currentIndex).toBe(0);
    expect(recovered.viewedSpotIds).toEqual([]);
    expect(recovered.favoriteSpotIds).toEqual(["b"]);
  });

  it("rebuilds a duplicate deck safely", () => {
    const recovered = recoverPersistedWanderState(
      {
        version: 1,
        deckSpotIds: ["a", "a"],
        currentIndex: 1,
        viewedSpotIds: ["a"],
        favoriteSpotIds: ["b"],
        lastAction: null,
      },
      ["a", "b"],
      stableRandom,
    );

    expect(new Set(recovered.deckSpotIds)).toEqual(new Set(["a", "b"]));
    expect(recovered.currentIndex).toBe(0);
    expect(recovered.favoriteSpotIds).toEqual(["b"]);
  });
});
