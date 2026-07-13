import { ArrowUp, Heart, RotateCcw, X } from "lucide-react";

type DiscoverActionsProps = {
  isDisabled: boolean;
  canUndo: boolean;
  isFavorite: boolean;
  onUndo: () => void;
  onSkip: () => void;
  onDetail: () => void;
  onFavorite: () => void;
};

export function DiscoverActions({
  isDisabled,
  canUndo,
  isFavorite,
  onUndo,
  onSkip,
  onDetail,
  onFavorite,
}: DiscoverActionsProps) {
  return (
    <div className="discover-actions" aria-label="観光地カードの操作">
      <button
        className="discover-action discover-action--undo"
        type="button"
        disabled={isDisabled || !canUndo}
        aria-label="直前の操作を戻す"
        title="戻る"
        onClick={onUndo}
      >
        <RotateCcw aria-hidden="true" size={25} strokeWidth={2.8} />
      </button>
      <button
        className="discover-action discover-action--skip"
        type="button"
        disabled={isDisabled}
        aria-label="この観光地をスキップ"
        title="スキップ"
        onClick={onSkip}
      >
        <X aria-hidden="true" size={29} strokeWidth={3} />
      </button>
      <button
        className="discover-action discover-action--detail"
        type="button"
        disabled={isDisabled}
        aria-label="この観光地の詳細を表示"
        title="詳細"
        onClick={onDetail}
      >
        <ArrowUp aria-hidden="true" size={28} strokeWidth={2.8} />
      </button>
      <button
        className="discover-action discover-action--favorite"
        type="button"
        disabled={isDisabled}
        aria-label="この観光地をお気に入りへ保存"
        title="お気に入り"
        onClick={onFavorite}
      >
        <Heart
          aria-hidden="true"
          size={27}
          strokeWidth={2.8}
          fill={isFavorite ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
}
