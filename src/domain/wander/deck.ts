import type { RandomSource } from "./types";

export function fisherYatesShuffle<T>(
  items: readonly T[],
  random: RandomSource = Math.random,
): T[] {
  const shuffledItems = [...items];

  for (let currentIndex = shuffledItems.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomValue = random();

    if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
      throw new RangeError("Random source must return a finite value from 0 up to, but not including, 1.");
    }

    const swapIndex = Math.floor(randomValue * (currentIndex + 1));
    const currentItem = shuffledItems[currentIndex];
    shuffledItems[currentIndex] = shuffledItems[swapIndex];
    shuffledItems[swapIndex] = currentItem;
  }

  return shuffledItems;
}

export function getUniqueSpotIds(spotIds: readonly string[]): string[] {
  const uniqueSpotIds: string[] = [];
  const seenSpotIds = new Set<string>();

  for (const spotId of spotIds) {
    if (seenSpotIds.has(spotId)) {
      continue;
    }

    seenSpotIds.add(spotId);
    uniqueSpotIds.push(spotId);
  }

  return uniqueSpotIds;
}

export function createShuffledDeck(
  spotIds: readonly string[],
  random: RandomSource = Math.random,
): string[] {
  return fisherYatesShuffle(getUniqueSpotIds(spotIds), random);
}
