import { useState, useRef, useCallback } from "react";
import { ImageBounds } from "../../../../types";
import { CoordinateMapper } from "../../../../hooks/useCoordinateMapper";
import { ViewportOffset } from "../types";

interface UseViewportOffsetParams {
  imageBounds: ImageBounds | null;
  coordinateMapper: CoordinateMapper;
  myUserId: string | null;
  myPosition: { x: number; y: number };
  worldMapWidth: number;
  worldMapHeight: number;
}

export const useViewportOffset = ({
  imageBounds,
  coordinateMapper,
  myUserId,
  myPosition,
  worldMapWidth,
  worldMapHeight,
}: UseViewportOffsetParams) => {
  const [viewportOffset, setViewportOffset] = useState<ViewportOffset>({ offsetX: 0, offsetY: 0 });
  const initializedRef = useRef(false);

  const calculateViewportOffset = useCallback((): ViewportOffset => {
    if (!imageBounds || !coordinateMapper.isReady || !myUserId || worldMapWidth === 0 || worldMapHeight === 0) {
      return { offsetX: 0, offsetY: 0 };
    }

    // Get user's position in screen coordinates (untransformed)
    const userScreenPos = coordinateMapper.imageRelativeToScreen({
      x: myPosition.x,
      y: myPosition.y,
    });

    if (!userScreenPos) {
      return { offsetX: 0, offsetY: 0 };
    }

    // Viewport center
    const viewportCenterX = imageBounds.containerLeft + imageBounds.containerWidth / 2;
    const viewportCenterY = imageBounds.containerTop + imageBounds.containerHeight / 2;

    // Calculate offset: (center - userPos)
    // Translation already happens in scaled space because scale is applied about the center
    const offsetX = viewportCenterX - userScreenPos.x;
    const offsetY = viewportCenterY - userScreenPos.y;

    return { offsetX, offsetY };
  }, [imageBounds, coordinateMapper, myUserId, myPosition, worldMapWidth, worldMapHeight]);

  return {
    viewportOffset,
    setViewportOffset,
    calculateViewportOffset,
    initializedRef,
  };
};

