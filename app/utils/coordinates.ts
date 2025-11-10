import { ImageBounds, Position } from "../types";
import { ImageRelativePosition, ScreenPosition } from "../hooks/useCoordinateMapper";

/**
 * Convert image-relative percentage coordinates to viewport coordinates
 * @deprecated Consider using useCoordinateMapper hook for better scaling support
 */
export const getViewportPosition = (
  position: Position,
  imageBounds: ImageBounds | null
): Position => {
  if (!imageBounds) {
    return { x: 0, y: 0 };
  }

  const x = imageBounds.left + (position.x / 100) * imageBounds.width;
  const y = imageBounds.top + (position.y / 100) * imageBounds.height;

  return {
    x: ((x - imageBounds.containerLeft) / imageBounds.containerWidth) * 100,
    y: ((y - imageBounds.containerTop) / imageBounds.containerHeight) * 100,
  };
};

/**
 * Convert viewport coordinates to image-relative percentage coordinates
 * @deprecated Consider using useCoordinateMapper hook for better scaling support
 */
export const getImagePosition = (
  clientX: number,
  clientY: number,
  imageBounds: ImageBounds | null
): Position | null => {
  if (!imageBounds) return null;

  const x = Math.max(
    0,
    Math.min(100, ((clientX - imageBounds.left) / imageBounds.width) * 100)
  );
  const y = Math.max(
    0,
    Math.min(100, ((clientY - imageBounds.top) / imageBounds.height) * 100)
  );

  return { x, y };
};

/**
 * Convert image-relative size percentage to viewport size percentage
 * Uses the coordinate mapper system for proper scaling across screen sizes
 */
export const getViewportSize = (
  imageSizePercent: number,
  imageBounds: ImageBounds | null
): number => {
  if (!imageBounds) {
    return 0;
  }
  // Convert percentage of image width to pixels, then to viewport percentage
  const sizeInPixels = (imageSizePercent / 100) * imageBounds.width;
  return (sizeInPixels / imageBounds.containerWidth) * 100;
};

/**
 * Get token size as percentage of image width
 */
export const getTokenSizePercent = (): number => {
  return 5; // 5% of image width
};

/**
 * Helper to convert Position to ImageRelativePosition
 */
export const positionToImageRelative = (position: Position): ImageRelativePosition => {
  return { x: position.x, y: position.y };
};

/**
 * Helper to convert ImageRelativePosition to Position
 */
export const imageRelativeToPosition = (pos: ImageRelativePosition): Position => {
  return { x: pos.x, y: pos.y };
};

/**
 * Helper to convert ScreenPosition to Position (for viewport percentage)
 */
export const screenToViewportPosition = (
  screenPos: ScreenPosition,
  imageBounds: ImageBounds | null
): Position => {
  if (!imageBounds) {
    return { x: 0, y: 0 };
  }
  
  return {
    x: ((screenPos.x - imageBounds.containerLeft) / imageBounds.containerWidth) * 100,
    y: ((screenPos.y - imageBounds.containerTop) / imageBounds.containerHeight) * 100,
  };
};

/**
 * Snap a position to the nearest grid square center
 * @param position - Position in image-relative percentage coordinates
 * @param gridData - Grid data with vertical/horizontal lines and image dimensions
 * @param gridScale - Scale factor for grid size
 * @param gridOffsetX - Horizontal offset in pixels
 * @param gridOffsetY - Vertical offset in pixels
 * @returns Snapped position in image-relative percentage coordinates
 */
export const snapToGridCenter = (
  position: Position,
  gridData: {
    verticalLines: number[];
    horizontalLines: number[];
    imageWidth: number;
    imageHeight: number;
  },
  gridScale: number = 1.0,
  gridOffsetX: number = 0,
  gridOffsetY: number = 0
): Position => {
  // Calculate average spacing from original lines (same logic as GridLines)
  const calculateAverageSpacing = (lines: number[]): number => {
    if (lines.length < 2) return 0;
    const sorted = [...lines].sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(sorted[i] - sorted[i - 1]);
    }
    return intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  };

  const { verticalLines, horizontalLines, imageWidth, imageHeight } = gridData;
  
  const avgVerticalSpacing = calculateAverageSpacing(verticalLines);
  const avgHorizontalSpacing = calculateAverageSpacing(horizontalLines);
  const avgSpacing = Math.max(avgVerticalSpacing, avgHorizontalSpacing) || avgVerticalSpacing || avgHorizontalSpacing;
  
  if (avgSpacing <= 0) {
    // Can't snap if we can't calculate spacing
    return position;
  }

  // Calculate scaled spacing
  const scaledSpacing = avgSpacing * gridScale;

  // Convert position from percentage to world pixels
  const worldX = (position.x / 100) * imageWidth;
  const worldY = (position.y / 100) * imageHeight;

  // Calculate center points (grid origin)
  const centerX = imageWidth / 2;
  const centerY = imageHeight / 2;

  // Account for grid offset
  const offsetX = worldX - gridOffsetX;
  const offsetY = worldY - gridOffsetY;

  // Calculate grid coordinates (which grid square, relative to center)
  // Grid squares are centered at the image center, so we need to find the nearest grid square center
  const relativeX = offsetX - centerX;
  const relativeY = offsetY - centerY;

  // Find the nearest grid square center
  // Grid lines are at: center + n * scaledSpacing (where n is an integer)
  // Grid square centers are at: center + (n + 0.5) * scaledSpacing (halfway between lines)
  // First, find which grid cell we're in (using floor to get the cell index)
  const cellX = Math.floor(relativeX / scaledSpacing);
  const cellY = Math.floor(relativeY / scaledSpacing);
  
  // Then calculate the center of that cell (add 0.5 to get the center)
  const gridX = (cellX + 0.5) * scaledSpacing;
  const gridY = (cellY + 0.5) * scaledSpacing;

  // Convert back to absolute world coordinates
  const snappedWorldX = centerX + gridX + gridOffsetX;
  const snappedWorldY = centerY + gridY + gridOffsetY;

  // Convert back to percentage
  return {
    x: (snappedWorldX / imageWidth) * 100,
    y: (snappedWorldY / imageHeight) * 100,
  };
};

