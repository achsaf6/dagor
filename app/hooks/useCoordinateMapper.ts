import { useMemo } from "react";
import { ImageBounds } from "../types";

export interface WorldMapPosition {
  x: number; // Pixel coordinate in the world map image
  y: number; // Pixel coordinate in the world map image
}

export interface ScreenPosition {
  x: number; // Pixel coordinate on screen (clientX/clientY)
  y: number; // Pixel coordinate on screen (clientX/clientY)
}

export interface ImageRelativePosition {
  x: number; // Percentage (0-100) relative to image bounds
  y: number; // Percentage (0-100) relative to image bounds
}

export interface CoordinateMapper {
  // Convert screen pixel coordinates to world map pixel coordinates
  screenToWorldMap: (screenPos: ScreenPosition) => WorldMapPosition | null;
  
  // Convert world map pixel coordinates to screen pixel coordinates
  worldMapToScreen: (worldPos: WorldMapPosition) => ScreenPosition | null;
  
  // Convert screen pixel coordinates to image-relative percentage (0-100)
  screenToImageRelative: (screenPos: ScreenPosition) => ImageRelativePosition | null;
  
  // Convert image-relative percentage to screen pixel coordinates
  imageRelativeToScreen: (imagePos: ImageRelativePosition) => ScreenPosition | null;
  
  // Convert world map pixel coordinates to image-relative percentage
  worldMapToImageRelative: (worldPos: WorldMapPosition, worldMapWidth: number, worldMapHeight: number) => ImageRelativePosition | null;
  
  // Convert image-relative percentage to world map pixel coordinates
  imageRelativeToWorldMap: (imagePos: ImageRelativePosition, worldMapWidth: number, worldMapHeight: number) => WorldMapPosition | null;
  
  // Get scale factors for converting between world map and screen
  getScaleX: () => number; // Screen pixels per world map pixel (X axis)
  getScaleY: () => number; // Screen pixels per world map pixel (Y axis)
  
  // Get scale factor for sizes (assumes uniform scaling)
  getSizeScale: () => number;
  
  // Check if mapper is ready (has valid imageBounds)
  isReady: boolean;
}

/**
 * Hook that provides a comprehensive coordinate mapping system
 * for converting between screen coordinates, world map coordinates, and image-relative coordinates.
 * 
 * This ensures proper scaling across all screen sizes by using the imageBounds
 * which accounts for object-contain CSS behavior.
 */
export const useCoordinateMapper = (
  imageBounds: ImageBounds | null,
  worldMapWidth: number = 0,
  worldMapHeight: number = 0
): CoordinateMapper => {
  const mapper = useMemo<CoordinateMapper>(() => {
    if (!imageBounds || worldMapWidth === 0 || worldMapHeight === 0) {
      return {
        screenToWorldMap: () => null,
        worldMapToScreen: () => null,
        screenToImageRelative: () => null,
        imageRelativeToScreen: () => null,
        worldMapToImageRelative: () => null,
        imageRelativeToWorldMap: () => null,
        getScaleX: () => 0,
        getScaleY: () => 0,
        getSizeScale: () => 0,
        isReady: false,
      };
    }

    // Calculate scale factors: how many screen pixels per world map pixel
    const scaleX = imageBounds.width / worldMapWidth;
    const scaleY = imageBounds.height / worldMapHeight;
    const sizeScale = Math.min(scaleX, scaleY); // Use minimum for uniform scaling

    return {
      screenToWorldMap: (screenPos: ScreenPosition): WorldMapPosition | null => {
        // Convert screen coordinates to image-relative coordinates first
        const relativeX = ((screenPos.x - imageBounds.left) / imageBounds.width) * 100;
        const relativeY = ((screenPos.y - imageBounds.top) / imageBounds.height) * 100;
        
        // Clamp to image bounds
        if (relativeX < 0 || relativeX > 100 || relativeY < 0 || relativeY > 100) {
          return null;
        }
        
        // Convert to world map pixel coordinates
        const worldX = (relativeX / 100) * worldMapWidth;
        const worldY = (relativeY / 100) * worldMapHeight;
        
        return { x: worldX, y: worldY };
      },

      worldMapToScreen: (worldPos: WorldMapPosition): ScreenPosition | null => {
        // Convert world map coordinates to image-relative percentage
        const relativeX = (worldPos.x / worldMapWidth) * 100;
        const relativeY = (worldPos.y / worldMapHeight) * 100;
        
        // Convert to screen pixel coordinates
        const screenX = imageBounds.left + (relativeX / 100) * imageBounds.width;
        const screenY = imageBounds.top + (relativeY / 100) * imageBounds.height;
        
        return { x: screenX, y: screenY };
      },

      screenToImageRelative: (screenPos: ScreenPosition): ImageRelativePosition | null => {
        const relativeX = ((screenPos.x - imageBounds.left) / imageBounds.width) * 100;
        const relativeY = ((screenPos.y - imageBounds.top) / imageBounds.height) * 100;
        
        // Clamp to image bounds
        if (relativeX < 0 || relativeX > 100 || relativeY < 0 || relativeY > 100) {
          return null;
        }
        
        return {
          x: Math.max(0, Math.min(100, relativeX)),
          y: Math.max(0, Math.min(100, relativeY)),
        };
      },

      imageRelativeToScreen: (imagePos: ImageRelativePosition): ScreenPosition | null => {
        const screenX = imageBounds.left + (imagePos.x / 100) * imageBounds.width;
        const screenY = imageBounds.top + (imagePos.y / 100) * imageBounds.height;
        
        return { x: screenX, y: screenY };
      },

      worldMapToImageRelative: (
        worldPos: WorldMapPosition,
        mapWidth: number,
        mapHeight: number
      ): ImageRelativePosition | null => {
        const relativeX = (worldPos.x / mapWidth) * 100;
        const relativeY = (worldPos.y / mapHeight) * 100;
        
        return {
          x: Math.max(0, Math.min(100, relativeX)),
          y: Math.max(0, Math.min(100, relativeY)),
        };
      },

      imageRelativeToWorldMap: (
        imagePos: ImageRelativePosition,
        mapWidth: number,
        mapHeight: number
      ): WorldMapPosition | null => {
        const worldX = (imagePos.x / 100) * mapWidth;
        const worldY = (imagePos.y / 100) * mapHeight;
        
        return { x: worldX, y: worldY };
      },

      getScaleX: () => scaleX,
      getScaleY: () => scaleY,
      getSizeScale: () => sizeScale,
      isReady: true,
    };
  }, [imageBounds, worldMapWidth, worldMapHeight]);

  return mapper;
};

