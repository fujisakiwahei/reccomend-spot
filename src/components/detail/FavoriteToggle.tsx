"use client";

import { Heart } from "lucide-react";
import { selectIsFavorite } from "@/domain/wander/selectors";
import { useWanderState } from "@/providers/WanderStateProvider";

type FavoriteToggleProps = {
  spotId: string;
};

export function FavoriteToggle({ spotId }: FavoriteToggleProps) {
  const { state, isHydrated, toggleFavorite } = useWanderState();
  const isFavorite = selectIsFavorite(state, spotId);

  return (
    <button
      className="favorite-toggle"
      type="button"
      disabled={!isHydrated}
      aria-pressed={isFavorite}
      onClick={() => toggleFavorite(spotId)}
    >
      <Heart
        aria-hidden="true"
        size={23}
        strokeWidth={2.7}
        fill={isFavorite ? "currentColor" : "none"}
      />
      {isFavorite ? "お気に入りから外す" : "お気に入りへ保存"}
    </button>
  );
}
