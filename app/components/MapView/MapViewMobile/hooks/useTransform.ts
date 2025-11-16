import { useMemo } from "react";
import { TransformConfig, PanState, ViewportOffset } from "../types";

interface UseTransformParams {
  isMounted: boolean;
  mobileZoomScale: number;
  panState: PanState;
  viewportOffset: ViewportOffset;
  isPinching: boolean;
}

export const useTransform = ({
  isMounted,
  mobileZoomScale,
  panState,
  viewportOffset,
  isPinching,
}: UseTransformParams) => {
  const transform = useMemo<TransformConfig>(() => {
    if (!isMounted) {
      return { scale: 1, translateX: 0, translateY: 0 };
    }

    // Use pan state if actively panning, otherwise use calculated viewport offset
    const translateX = panState.isPanning || panState.translateX !== 0 
      ? panState.translateX 
      : viewportOffset.offsetX;
    const translateY = panState.isPanning || panState.translateY !== 0 
      ? panState.translateY 
      : viewportOffset.offsetY;

    return {
      scale: mobileZoomScale,
      translateX,
      translateY,
    };
  }, [isMounted, mobileZoomScale, panState, viewportOffset]);

  const mapWrapperStyle = {
    transform: isMounted && transform.scale !== 1
      ? `scale(${transform.scale}) translate(${transform.translateX}px, ${transform.translateY}px)`
      : 'scale(1) translate(0px, 0px)',
    transformOrigin: 'center center',
    width: '100%',
    height: '100%',
    transition: isMounted && (panState.isPanning || isPinching) ? 'none' : 'transform 0.3s ease-out',
  };

  return {
    transform,
    mapWrapperStyle,
  };
};

