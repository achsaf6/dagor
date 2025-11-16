import { useRef, useCallback } from "react";
import { PanState } from "../types";
import { ViewportOffset } from "../types";

interface UseAutoCenterParams {
  calculateViewportOffset: () => ViewportOffset;
  setViewportOffset: (offset: ViewportOffset) => void;
  setPanState: React.Dispatch<React.SetStateAction<PanState>>;
  shouldAutoCenter: () => boolean;
}

const INACTIVITY_TIMEOUT = 5000;

export const useAutoCenter = ({
  calculateViewportOffset,
  setViewportOffset,
  setPanState,
  shouldAutoCenter,
}: UseAutoCenterParams) => {
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = useRef<number>(0);

  const handleAutoCenter = useCallback(() => {
    if (!shouldAutoCenter()) {
      return;
    }

    const offset = calculateViewportOffset();
    setViewportOffset(offset);
    setPanState(current => ({
      ...current,
      translateX: offset.offsetX,
      translateY: offset.offsetY,
    }));
  }, [calculateViewportOffset, setViewportOffset, setPanState, shouldAutoCenter]);

  const resetInactivityTimer = useCallback(() => {
    lastInteractionRef.current = Date.now();

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceLastInteraction >= INACTIVITY_TIMEOUT && shouldAutoCenter()) {
        handleAutoCenter();
      }
    }, INACTIVITY_TIMEOUT);
  }, [handleAutoCenter, shouldAutoCenter]);

  return {
    resetInactivityTimer,
    inactivityTimerRef,
    lastInteractionRef,
    handleAutoCenter,
  };
};

