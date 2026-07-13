import { describe, expect, it } from "vitest";
import { createInitialWanderState } from "@/domain/wander/migrate";
import { reduceWanderState } from "@/domain/wander/reducer";
import type { PersistedWanderMatchState } from "@/domain/wander/types";

const spotIds = ["a", "b"] as const;
const stableRandom = () => 0.999;
const context = { spotIds, random: stableRandom };

describe("reduceWanderState", () => {
  it("favorites the current spot and restores it with one-step Undo", () => {
    const initial = createInitialWanderState(spotIds, stableRandom);
    const committed = reduceWanderState(
      initial,
      { type: "COMMIT_CURRENT", action: "favorite" },
      context,
    );

    expect(committed.currentIndex).toBe(1);
    expect(committed.viewedSpotIds).toEqual(["a"]);
    expect(committed.favoriteSpotIds).toEqual(["a"]);

    const restored = reduceWanderState(committed, { type: "UNDO_LAST" }, context);
    expect(restored.currentIndex).toBe(0);
    expect(restored.viewedSpotIds).toEqual([]);
    expect(restored.favoriteSpotIds).toEqual([]);
    expect(restored.lastAction).toBeNull();
  });

  it("does not remove an existing favorite after skip or Undo", () => {
    const initial: PersistedWanderMatchState = {
      ...createInitialWanderState(spotIds, stableRandom),
      favoriteSpotIds: ["a"],
    };
    const skipped = reduceWanderState(
      initial,
      { type: "COMMIT_CURRENT", action: "skip" },
      context,
    );
    const restored = reduceWanderState(skipped, { type: "UNDO_LAST" }, context);

    expect(skipped.favoriteSpotIds).toEqual(["a"]);
    expect(restored.favoriteSpotIds).toEqual(["a"]);
  });

  it("can Undo the action that crossed a cycle boundary", () => {
    const oneSpotContext = { spotIds: ["a"], random: stableRandom };
    const initial = createInitialWanderState(["a"], stableRandom);
    const nextCycle = reduceWanderState(
      initial,
      { type: "COMMIT_CURRENT", action: "favorite" },
      oneSpotContext,
    );

    expect(nextCycle.currentIndex).toBe(0);
    expect(nextCycle.viewedSpotIds).toEqual([]);
    expect(nextCycle.lastAction?.cycleBoundarySnapshot).toBeDefined();

    const restored = reduceWanderState(
      nextCycle,
      { type: "UNDO_LAST" },
      oneSpotContext,
    );
    expect(restored.deckSpotIds).toEqual(["a"]);
    expect(restored.currentIndex).toBe(0);
    expect(restored.favoriteSpotIds).toEqual([]);
  });

  it("resets history without deleting favorites", () => {
    const initial: PersistedWanderMatchState = {
      ...createInitialWanderState(spotIds, stableRandom),
      currentIndex: 1,
      viewedSpotIds: ["a"],
      favoriteSpotIds: ["a"],
    };
    const reset = reduceWanderState(initial, { type: "RESET_HISTORY" }, context);

    expect(reset.currentIndex).toBe(0);
    expect(reset.viewedSpotIds).toEqual([]);
    expect(reset.favoriteSpotIds).toEqual(["a"]);
  });
});
