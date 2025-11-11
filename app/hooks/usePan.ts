import { useState, useCallback, useEffect, useRef } from "react";

export interface PanState {
  translateX: number;
  translateY: number;
  isPanning: boolean;
}

interface UsePanOptions {
  enabled: boolean;
  onAutoCenter?: () => void;
  inactivityTimeout?: number; // milliseconds
  scale?: number; // Scale factor to account for zoom (default 1)
}

/**
 * Hook for managing pan state and auto-centering after inactivity
 */
export const usePan = ({
  enabled,
  onAutoCenter,
  inactivityTimeout = 5000, // 5 seconds default
  scale = 1,
}: UsePanOptions) => {
  const [panState, setPanState] = useState<PanState>({
    translateX: 0,
    translateY: 0,
    isPanning: false,
  });

  const [startPanPos, setStartPanPos] = useState<{ x: number; y: number } | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = useRef<number>(0);
  
  // Initialize lastInteractionRef on mount
  useEffect(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (!enabled || !onAutoCenter) return;

    lastInteractionRef.current = Date.now();

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
      // Only auto-center if we've been inactive for the full timeout period
      if (timeSinceLastInteraction >= inactivityTimeout) {
        onAutoCenter?.();
      }
    }, inactivityTimeout);
  }, [enabled, onAutoCenter, inactivityTimeout]);

  // Start panning
  const startPan = useCallback((clientX: number, clientY: number) => {
    if (!enabled) return;
    
    setStartPanPos({ x: clientX, y: clientY });
    setPanState((prev) => ({ ...prev, isPanning: true }));
    resetInactivityTimer();
  }, [enabled, resetInactivityTimer]);

  // Update pan position
  // Account for scale so pan movement is proportionate to drag distance
  const updatePan = useCallback((clientX: number, clientY: number) => {
    if (!enabled || !startPanPos) return;

    const deltaX = clientX - startPanPos.x;
    const deltaY = clientY - startPanPos.y;

    // Divide by scale so that dragging 100px moves the map by 100px visually
    // When scaled 2.5x, we need to move less in transform space to match visual movement
    const scaledDeltaX = deltaX / scale;
    const scaledDeltaY = deltaY / scale;

    setPanState((prev) => ({
      translateX: prev.translateX + scaledDeltaX,
      translateY: prev.translateY + scaledDeltaY,
      isPanning: true,
    }));

    setStartPanPos({ x: clientX, y: clientY });
    resetInactivityTimer();
  }, [enabled, startPanPos, resetInactivityTimer, scale]);

  // End panning
  const endPan = useCallback(() => {
    if (!enabled) return;
    
    setStartPanPos(null);
    setPanState((prev) => ({ ...prev, isPanning: false }));
    resetInactivityTimer();
  }, [enabled, resetInactivityTimer]);

  // Set pan position directly (for auto-centering)
  const setPanPosition = useCallback((x: number, y: number, animated: boolean = true) => {
    if (!enabled) return;

    if (animated) {
      // Smooth transition
      setPanState((prev) => ({
        ...prev,
        translateX: x,
        translateY: y,
      }));
    } else {
      setPanState((prev) => ({
        ...prev,
        translateX: x,
        translateY: y,
      }));
    }
  }, [enabled]);

  // Reset pan to center
  const resetPan = useCallback((animated: boolean = true) => {
    setPanPosition(0, 0, animated);
  }, [setPanPosition]);

  // Track any interaction to reset timer
  const trackInteraction = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Initialize timer on mount if enabled
  useEffect(() => {
    if (enabled && onAutoCenter) {
      resetInactivityTimer();
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [enabled, onAutoCenter, resetInactivityTimer]);

  return {
    panState,
    startPan,
    updatePan,
    endPan,
    setPanPosition,
    resetPan,
    trackInteraction,
  };
};

