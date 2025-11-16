import { useEffect, useRef } from "react";
import { PanState } from "../types";

interface UseHammerGesturesParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isMounted: boolean;
  panState: PanState;
  panStateRef: React.MutableRefObject<PanState>;
  panStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  setPanState: React.Dispatch<React.SetStateAction<PanState>>;
  mobileZoomScale: number;
  setMobileZoomScale: React.Dispatch<React.SetStateAction<number>>;
  zoomScaleRef: React.MutableRefObject<number>;
  minZoom: number;
  maxZoom: number;
  draggingTokenIdRef: React.MutableRefObject<string | null>;
  setIsPinching: React.Dispatch<React.SetStateAction<boolean>>;
  resetInactivityTimer: () => void;
}

export const useHammerGestures = ({
  containerRef,
  isMounted,
  panState,
  panStateRef,
  panStartPosRef,
  setPanState,
  mobileZoomScale,
  setMobileZoomScale,
  zoomScaleRef,
  minZoom,
  maxZoom,
  draggingTokenIdRef,
  setIsPinching,
  resetInactivityTimer,
}: UseHammerGesturesParams) => {
  const hammerRef = useRef<{ destroy: () => void; on: (event: string, handler: (e: { srcEvent: Event; deltaX: number; deltaY: number }) => void) => void } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !isMounted) return;

    let isComponentMounted = true;

    // Dynamically import hammerjs only on client side
    import("hammerjs").then((HammerModule) => {
      if (!isComponentMounted || !containerRef.current) return;

      const Hammer = HammerModule.default;
      
      const hammer = new Hammer(containerRef.current, {
        touchAction: "none",
      });

      // Create pinch recognizer
      const pinch = new Hammer.Pinch({ enable: true });
      
      // Create pan recognizer
      const pan = new Hammer.Pan({ 
        direction: Hammer.DIRECTION_ALL, 
        threshold: 5,
      });

      // Make pan and pinch work together
      pan.recognizeWith(pinch);
      pinch.recognizeWith(pan);
      
      // Add recognizers to hammer
      hammer.add([pan, pinch]);

      hammerRef.current = hammer;

      // Track if we're currently pinching
      const isPinchingRef = { current: false };

      // Pan start handler
      hammer.on("panstart", (e) => {
        // Don't pan if pinching or if a token is being dragged
        if (isPinchingRef.current || draggingTokenIdRef.current) {
          return;
        }

        // Check if the target is a token element
        const target = e.srcEvent.target as HTMLElement;
        const tokenElement = target.closest('[data-token]');
        if (tokenElement) {
          return; // Let token handle it
        }

        e.srcEvent.preventDefault();
        e.srcEvent.stopPropagation();

        panStartPosRef.current = {
          x: panStateRef.current.translateX,
          y: panStateRef.current.translateY,
        };

        setPanState(current => ({
          ...current,
          isPanning: true,
        }));

        resetInactivityTimer();
      });

      // Pan move handler
      hammer.on("panmove", (e) => {
        if (isPinchingRef.current || !panStateRef.current.isPanning || draggingTokenIdRef.current || !panStartPosRef.current) {
          return;
        }

        e.srcEvent.preventDefault();

        // Capture the start position to avoid race conditions
        const startPos = panStartPosRef.current;
        if (!startPos) {
          return;
        }

        // Calculate new position accounting for scale
        // Divide by scale so that dragging 100px moves the map by 100px visually
        const currentScale = zoomScaleRef.current;
        const deltaX = e.deltaX / currentScale;
        const deltaY = e.deltaY / currentScale;

        setPanState(() => ({
          translateX: startPos.x + deltaX,
          translateY: startPos.y + deltaY,
          isPanning: true,
        }));

        resetInactivityTimer();
      });

      // Pan end handler
      hammer.on("panend", (e) => {
        e.srcEvent.preventDefault();
        panStartPosRef.current = null;
        setPanState(current => ({
          ...current,
          isPanning: false,
        }));
        resetInactivityTimer();
      });

      // Pan cancel handler
      hammer.on("pancancel", () => {
        panStartPosRef.current = null;
        setPanState(current => ({
          ...current,
          isPanning: false,
        }));
        resetInactivityTimer();
      });

      // Pinch start handler
      const pinchStartScaleRef = { current: zoomScaleRef.current };
      const pinchStartTranslateRef = { current: { x: panStateRef.current.translateX, y: panStateRef.current.translateY } };
      const pinchCenterRef = { current: { x: 0, y: 0 } };

      hammer.on("pinchstart", (e) => {
        if (draggingTokenIdRef.current) {
          return;
        }

        isPinchingRef.current = true;
        setIsPinching(true);
        e.srcEvent.preventDefault();
        e.srcEvent.stopPropagation();

        // Store initial scale and translate
        pinchStartScaleRef.current = zoomScaleRef.current;
        pinchStartTranslateRef.current = {
          x: panStateRef.current.translateX,
          y: panStateRef.current.translateY,
        };

        // Get the center point of the pinch in container coordinates
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          pinchCenterRef.current = {
            x: e.center.x - containerRect.left,
            y: e.center.y - containerRect.top,
          };
        }

        resetInactivityTimer();
      });

      // Pinch move handler
      hammer.on("pinchmove", (e) => {
        if (draggingTokenIdRef.current) {
          return;
        }

        e.srcEvent.preventDefault();
        e.srcEvent.stopPropagation();

        // Calculate new scale with limits
        const newScale = Math.max(
          minZoom,
          Math.min(maxZoom, pinchStartScaleRef.current * e.scale)
        );

        // Calculate the viewport center in container coordinates
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const viewportCenterX = containerRect.width / 2;
        const viewportCenterY = containerRect.height / 2;

        // The pinch center in container coordinates
        const pinchCenter = pinchCenterRef.current;

        // Calculate how much the translate needs to change to keep the pinch point fixed
        // When scaling, we need to adjust translate so the point under the pinch stays in place
        // Since CSS applies translate before scale, we need to account for that
        const scaleChange = newScale / pinchStartScaleRef.current;
        
        // Calculate the offset from viewport center to pinch center
        const offsetX = pinchCenter.x - viewportCenterX;
        const offsetY = pinchCenter.y - viewportCenterY;

        // Adjust translate to keep pinch point fixed
        // Formula: newTranslate = oldTranslate + (pinchCenter - viewportCenter) * (1 - 1/scaleChange)
        const newTranslateX = pinchStartTranslateRef.current.x + offsetX * (1 - 1 / scaleChange);
        const newTranslateY = pinchStartTranslateRef.current.y + offsetY * (1 - 1 / scaleChange);

        setMobileZoomScale(newScale);
        setPanState({
          translateX: newTranslateX,
          translateY: newTranslateY,
          isPanning: false,
        });

        resetInactivityTimer();
      });

      // Pinch end handler
      hammer.on("pinchend", (e) => {
        isPinchingRef.current = false;
        setIsPinching(false);
        e.srcEvent.preventDefault();
        resetInactivityTimer();
      });

      // Pinch cancel handler
      hammer.on("pinchcancel", () => {
        isPinchingRef.current = false;
        setIsPinching(false);
        resetInactivityTimer();
      });

      // Track any interaction to reset timer
      hammer.on("tap", () => {
        resetInactivityTimer();
      });
    }).catch((error) => {
      console.error("Failed to load hammerjs:", error);
    });

    return () => {
      isComponentMounted = false;
      if (hammerRef.current) {
        hammerRef.current.destroy();
        hammerRef.current = null;
      }
    };
  }, [isMounted, resetInactivityTimer]);
};

