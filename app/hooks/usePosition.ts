import { useState, useCallback } from "react";
import { Position } from "../types";
import { ImageBounds } from "../types";
import { getImagePosition } from "../utils/coordinates";
import { useCoordinateMapper } from "./useCoordinateMapper";

interface TransformConfig {
  scale: number;
  translateX: number;
  translateY: number;
}

interface UsePositionReturn {
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleMouseUp: () => void;
  handleTouchEnd: () => void;
  updatePosition: (clientX: number, clientY: number) => Position | null;
}

/**
 * Apply inverse transform to screen coordinates to account for CSS transforms
 * CSS transforms apply right-to-left: scale(s) translate(x, y) means translate first, then scale
 * With transformOrigin: center center, the scale happens around the center point
 * 
 * Forward transform: P' = center + (P + translate - center) * scale
 * Inverse transform: P = center + (P' - center) / scale - translate
 */
const applyInverseTransform = (
  x: number,
  y: number,
  transform: TransformConfig,
  containerBounds: { left: number; top: number; width: number; height: number }
): { x: number; y: number } => {
  if (transform.scale === 1) {
    return { x, y };
  }

  // Get the center of the container (transform origin)
  const centerX = containerBounds.left + containerBounds.width / 2;
  const centerY = containerBounds.top + containerBounds.height / 2;

  // Translate coordinates relative to center
  const relativeX = x - centerX;
  const relativeY = y - centerY;

  // Apply inverse transform
  // Forward: P' = center + (P + translate - center) * scale
  // Inverse: P = center + (P' - center) / scale - translate
  const inverseScale = 1 / transform.scale;
  const untransformedX = relativeX * inverseScale - transform.translateX;
  const untransformedY = relativeY * inverseScale - transform.translateY;

  // Translate back to absolute coordinates
  return {
    x: untransformedX + centerX,
    y: untransformedY + centerY,
  };
};

export const usePosition = (
  imageBounds: ImageBounds | null,
  onPositionUpdate: (position: Position) => void,
  worldMapWidth: number = 0,
  worldMapHeight: number = 0,
  transform?: TransformConfig
): UsePositionReturn => {
  const [isDragging, setIsDragging] = useState(false);
  const coordinateMapper = useCoordinateMapper(
    imageBounds,
    worldMapWidth,
    worldMapHeight
  );

  const updatePosition = useCallback(
    (clientX: number, clientY: number): Position | null => {
      if (!imageBounds) return null;

      // Apply inverse transform if in mobile mode
      let adjustedX = clientX;
      let adjustedY = clientY;
      
      if (transform && transform.scale !== 1) {
        const containerBounds = {
          left: imageBounds.containerLeft,
          top: imageBounds.containerTop,
          width: imageBounds.containerWidth,
          height: imageBounds.containerHeight,
        };
        const adjusted = applyInverseTransform(clientX, clientY, transform, containerBounds);
        adjustedX = adjusted.x;
        adjustedY = adjusted.y;
      }

      // Use coordinate mapper if available, otherwise fallback to old system
      if (coordinateMapper.isReady && worldMapWidth > 0 && worldMapHeight > 0) {
        const screenPos = { x: adjustedX, y: adjustedY };
        const imageRelative = coordinateMapper.screenToImageRelative(screenPos);
        if (imageRelative) {
          const position: Position = { x: imageRelative.x, y: imageRelative.y };
          onPositionUpdate(position);
          return position;
        }
        return null;
      } else {
        // Fallback to old system
        const newPosition = getImagePosition(adjustedX, adjustedY, imageBounds);
        if (newPosition) {
          onPositionUpdate(newPosition);
        }
        return newPosition;
      }
    },
    [imageBounds, onPositionUpdate, coordinateMapper, worldMapWidth, worldMapHeight, transform]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      updatePosition(e.clientX, e.clientY);
    },
    [isDragging, updatePosition]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        updatePosition(touch.clientX, touch.clientY);
      }
    },
    [isDragging, updatePosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return {
    isDragging,
    handleMouseDown,
    handleTouchStart,
    handleMouseMove,
    handleTouchMove,
    handleMouseUp,
    handleTouchEnd,
    updatePosition,
  };
};

