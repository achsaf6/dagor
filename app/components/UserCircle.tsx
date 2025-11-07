import { Position, ImageBounds } from "../types";
import {
  getViewportPosition,
  getViewportSize,
  getCircleSizePercent,
  positionToImageRelative,
} from "../utils/coordinates";
import { useCoordinateMapper } from "../hooks/useCoordinateMapper";

interface UserCircleProps {
  position: Position;
  color: string;
  imageBounds: ImageBounds | null;
  worldMapWidth?: number;
  worldMapHeight?: number;
  isInteractive?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

export const UserCircle = ({
  position,
  color,
  imageBounds,
  worldMapWidth = 0,
  worldMapHeight = 0,
  isInteractive = false,
  onMouseDown,
  onTouchStart,
}: UserCircleProps) => {
  const coordinateMapper = useCoordinateMapper(
    imageBounds,
    worldMapWidth,
    worldMapHeight
  );

  if (!imageBounds) return null;

  // Use coordinate mapper if world map dimensions are available, otherwise fallback to old system
  let viewportPos: Position;
  let circleSize: number;

  if (coordinateMapper.isReady && worldMapWidth > 0 && worldMapHeight > 0) {
    // Convert image-relative position to screen position using coordinate mapper
    const imageRelative = positionToImageRelative(position);
    const screenPos = coordinateMapper.imageRelativeToScreen(imageRelative);
    
    if (screenPos) {
      // Convert screen position to viewport percentage
      viewportPos = {
        x: ((screenPos.x - imageBounds.containerLeft) / imageBounds.containerWidth) * 100,
        y: ((screenPos.y - imageBounds.containerTop) / imageBounds.containerHeight) * 100,
      };
      
      // Use coordinate mapper's size scale for proper scaling
      const sizeScale = coordinateMapper.getSizeScale();
      const baseSizePercent = getCircleSizePercent();
      const sizeInWorldPixels = (baseSizePercent / 100) * worldMapWidth;
      const sizeInScreenPixels = sizeInWorldPixels * sizeScale;
      circleSize = (sizeInScreenPixels / imageBounds.containerWidth) * 100;
    } else {
      // Fallback to old system
      viewportPos = getViewportPosition(position, imageBounds);
      circleSize = getViewportSize(getCircleSizePercent(), imageBounds);
    }
  } else {
    // Fallback to old system when coordinate mapper is not ready
    viewportPos = getViewportPosition(position, imageBounds);
    circleSize = getViewportSize(getCircleSizePercent(), imageBounds);
  }

  return (
    <div
      className={`absolute rounded-full border-2 border-white shadow-lg z-10 ${
        isInteractive ? "cursor-move" : ""
      }`}
      style={{
        left: `${viewportPos.x}%`,
        top: `${viewportPos.y}%`,
        width: `${circleSize}%`,
        aspectRatio: "1 / 1",
        transform: "translate(-50%, -50%)",
        backgroundColor: color,
        touchAction: isInteractive ? "none" : "auto",
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    />
  );
};

