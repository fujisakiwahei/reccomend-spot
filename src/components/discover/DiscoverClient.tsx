"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { SpotCardSummary } from "@/domain/spots/dto";
import {
  selectCanUndo,
  selectCurrentSpotId,
  selectIsFavorite,
} from "@/domain/wander/selectors";
import { rememberDetailEntry } from "@/infrastructure/navigation/detail-return.client";
import { useWanderState } from "@/providers/WanderStateProvider";
import { DiscoverActions } from "./DiscoverActions";
import { SpotCard } from "./SpotCard";

const AXIS_LOCK_THRESHOLD = 12;
const HORIZONTAL_COMMIT_THRESHOLD = 96;
const UPWARD_COMMIT_THRESHOLD = 84;
const TAP_SLOP = 8;
const DRAG_STEP_SIZE = 8;
const MAX_DRAG_STEP = 12;
const EXIT_DURATION = 240;

type DragAxis = "x" | "y" | null;
type ExitDirection = "left" | "right" | "up";

type ActivePointer = {
  pointerId: number;
  startX: number;
  startY: number;
  axis: DragAxis;
};

type DiscoverClientProps = {
  spots: readonly SpotCardSummary[];
};

export function DiscoverClient({ spots }: DiscoverClientProps) {
  const router = useRouter();
  const {
    state,
    isHydrated,
    commitCurrent,
    undoLast,
  } = useWanderState();
  const spotById = useMemo(
    () => new Map(spots.map((spot) => [spot.id, spot])),
    [spots],
  );
  const currentSpotId = selectCurrentSpotId(state);
  const currentSpot = currentSpotId === null ? null : spotById.get(currentSpotId) ?? null;
  const nextSpotId = state.deckSpotIds[state.currentIndex + 1];
  const nextSpot = nextSpotId === undefined ? null : spotById.get(nextSpotId) ?? null;
  const [dragClass, setDragClass] = useState("");
  const [dragDirection, setDragDirection] = useState<"left" | "right" | null>(null);
  const [exitDirection, setExitDirection] = useState<ExitDirection | null>(null);
  const activePointerRef = useRef<ActivePointer | null>(null);
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (nextSpot === null) {
      return;
    }

    const nextImage = new window.Image();
    nextImage.decoding = "async";
    nextImage.src = nextSpot.mainImage.url;
  }, [nextSpot]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const resetDrag = useCallback(() => {
    activePointerRef.current = null;
    setDragClass("");
    setDragDirection(null);
  }, []);

  const runExit = useCallback(
    (direction: ExitDirection, action: () => void) => {
      if (exitDirection !== null) {
        return;
      }

      resetDrag();
      setExitDirection(direction);
      exitTimerRef.current = window.setTimeout(() => {
        action();
        setExitDirection(null);
        exitTimerRef.current = null;
      }, EXIT_DURATION);
    },
    [exitDirection, resetDrag],
  );

  const openDetail = useCallback(() => {
    if (currentSpot === null) {
      return;
    }

    runExit("up", () => {
      rememberDetailEntry(currentSpot.slug, "/");
      router.push(`/spots/${currentSpot.slug}`);
    });
  }, [currentSpot, router, runExit]);

  const skipSpot = useCallback(() => {
    runExit("left", () => commitCurrent("skip"));
  }, [commitCurrent, runExit]);

  const favoriteSpot = useCallback(() => {
    runExit("right", () => commitCurrent("favorite"));
  }, [commitCurrent, runExit]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (!isHydrated || exitDirection !== null || shouldIgnoreKeyboardEvent(event)) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        skipSpot();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        favoriteSpot();
        return;
      }

      if (event.key === "Enter" || event.key === "ArrowUp") {
        event.preventDefault();
        openDetail();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [exitDirection, favoriteSpot, isHydrated, openDetail, skipSpot]);

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!isHydrated || exitDirection !== null) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      axis: null,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const pointer = activePointerRef.current;

    if (pointer === null || pointer.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - pointer.startX;
    const deltaY = event.clientY - pointer.startY;

    if (pointer.axis === null) {
      pointer.axis = selectDragAxis(deltaX, deltaY);
    }

    setDragClass(createDragClass(pointer.axis, deltaX, deltaY));

    if (pointer.axis === "x" && deltaX !== 0) {
      setDragDirection(deltaX > 0 ? "right" : "left");
    } else {
      setDragDirection(null);
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const pointer = activePointerRef.current;

    if (pointer === null || pointer.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - pointer.startX;
    const deltaY = event.clientY - pointer.startY;
    const axis = pointer.axis;
    event.currentTarget.releasePointerCapture(event.pointerId);
    resetDrag();

    if (axis === "x" && Math.abs(deltaX) >= HORIZONTAL_COMMIT_THRESHOLD) {
      if (deltaX > 0) {
        favoriteSpot();
      } else {
        skipSpot();
      }
      return;
    }

    if (axis === "y" && deltaY <= -UPWARD_COMMIT_THRESHOLD) {
      openDetail();
      return;
    }

    if (Math.hypot(deltaX, deltaY) <= TAP_SLOP) {
      openDetail();
    }
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLElement>) {
    if (activePointerRef.current?.pointerId === event.pointerId) {
      resetDrag();
    }
  }

  if (!isHydrated || currentSpot === null) {
    return (
      <div className="discover-skeleton" aria-live="polite">
        観光地カードを準備しています…
      </div>
    );
  }

  const isFavorite = selectIsFavorite(state, currentSpot.id);
  const actionsAreDisabled = exitDirection !== null;

  return (
    <>
      <SpotCard
        spot={currentSpot}
        dragClass={dragClass}
        dragDirection={dragDirection}
        exitDirection={exitDirection}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />
      <DiscoverActions
        isDisabled={actionsAreDisabled}
        canUndo={selectCanUndo(state)}
        isFavorite={isFavorite}
        onUndo={undoLast}
        onSkip={skipSpot}
        onDetail={openDetail}
        onFavorite={favoriteSpot}
      />
      <p className="discover-meta" aria-live="polite">
        <span>
          {state.currentIndex + 1} / {state.deckSpotIds.length}
        </span>
        <span>お気に入り {state.favoriteSpotIds.length}件</span>
        <span>← スキップ · ↑ 詳細 · → 保存</span>
      </p>
    </>
  );
}

function selectDragAxis(deltaX: number, deltaY: number): DragAxis {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < AXIS_LOCK_THRESHOLD) {
    return null;
  }

  if (Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
    return "x";
  }

  return "y";
}

function createDragClass(
  axis: DragAxis,
  deltaX: number,
  deltaY: number,
): string {
  if (axis === null) {
    return "";
  }

  const distance = axis === "x" ? deltaX : deltaY;

  if (axis === "y" && distance >= 0) {
    return "";
  }

  const step = Math.min(
    MAX_DRAG_STEP,
    Math.max(1, Math.round(Math.abs(distance) / DRAG_STEP_SIZE)),
  );
  const sign = distance < 0 ? "neg" : "pos";
  return `drag-${axis}-${sign}-${step}`;
}

function shouldIgnoreKeyboardEvent(event: KeyboardEvent): boolean {
  if (event.repeat) {
    return true;
  }

  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.matches("input, textarea, select, button, a, summary, [contenteditable='true']");
}
