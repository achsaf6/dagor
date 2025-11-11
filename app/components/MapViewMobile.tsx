"use client";

import React, { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import { useImageBounds } from "../hooks/useImageBounds";
import { useGridlines } from "../hooks/useGridlines";
import { useViewMode } from "../hooks/useViewMode";
import { useCoordinateMapper } from "../hooks/useCoordinateMapper";
import { usePan } from "../hooks/usePan";
import { useSettings } from "../hooks/useSettings";
import { MapImage } from "./MapImage";
import { DraggableToken } from "./DraggableToken";
import { TokenManager } from "./TokenManager";
import { GridLines } from "./GridLines";

export const MapViewMobile = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isMounted } = useViewMode();
  const { myUserId, myColor, myPosition, otherUsers, disconnectedUsers, updateTokenPosition, removeToken } = useSocket(false);
  const { imageBounds, updateBounds } = useImageBounds(containerRef);
  const { gridData } = useGridlines();
  const { settings } = useSettings();

  // Extract world map dimensions from gridData for coordinate mapping
  const worldMapWidth = gridData.imageWidth || 0;
  const worldMapHeight = gridData.imageHeight || 0;

  const coordinateMapper = useCoordinateMapper(
    imageBounds,
    worldMapWidth,
    worldMapHeight
  );

  // Mobile zoom factor - optimized for smartphone screens
  const mobileZoomScale = 2.5;

  // Calculate viewport offset to center on user token
  // CSS transform applies translate then scale around center
  // To center user at viewport center: translate = (center - userPos) / scale
  const calculateViewportOffset = useCallback(() => {
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

    // Calculate offset: (center - userPos) / scale
    // Divide by scale because translate happens before scale in CSS
    const offsetX = (viewportCenterX - userScreenPos.x) / mobileZoomScale;
    const offsetY = (viewportCenterY - userScreenPos.y) / mobileZoomScale;

    return { offsetX, offsetY };
  }, [imageBounds, coordinateMapper, myUserId, myPosition, worldMapWidth, worldMapHeight, mobileZoomScale]);

  // Recalculate offset when orientation changes or image bounds update
  const [viewportOffset, setViewportOffset] = useState({ offsetX: 0, offsetY: 0 });
  
  // Pan hook refs
  const panRef = useRef<{ setPanPosition: (x: number, y: number, animated: boolean) => void } | null>(null);
  const initializedRef = useRef(false);
  const isPanningRef = useRef(false);

  // Auto-center callback - recenters on user token after inactivity
  const handleAutoCenter = useCallback(() => {
    if (!imageBounds || !coordinateMapper.isReady) return;
    
    const offset = calculateViewportOffset();
    setViewportOffset(offset);
    if (panRef.current) {
      panRef.current.setPanPosition(offset.offsetX, offset.offsetY, true);
    }
  }, [imageBounds, coordinateMapper, calculateViewportOffset]);

  // Pan hook for mobile mode
  const pan = usePan({
    enabled: true,
    onAutoCenter: handleAutoCenter,
    inactivityTimeout: 5000,
    scale: mobileZoomScale,
  });

  // Update isPanning ref when pan state changes
  useEffect(() => {
    isPanningRef.current = pan.panState.isPanning;
  }, [pan.panState.isPanning]);

  // Store pan functions in ref
  useEffect(() => {
    panRef.current = {
      setPanPosition: pan.setPanPosition,
    };
  }, [pan.setPanPosition]);

  // Handle screen rotation and orientation changes
  useEffect(() => {
    if (!isMounted) return;

    const handleOrientationChange = () => {
      // Small delay to ensure layout has updated after rotation
      setTimeout(() => {
        updateBounds();
        const offset = calculateViewportOffset();
        setViewportOffset(offset);
        // Reset pan state and recenter after rotation
        if (panRef.current) {
          panRef.current.setPanPosition(offset.offsetX, offset.offsetY, true);
        }
      }, 100);
    };

    // Listen for orientation changes (mobile devices)
    window.addEventListener('orientationchange', handleOrientationChange);
    // Also listen for resize (handles both orientation and window resize)
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [isMounted, calculateViewportOffset, updateBounds]);

  // Recalculate viewport offset when image bounds change
  useEffect(() => {
    if (isMounted && imageBounds && coordinateMapper.isReady) {
      const offset = calculateViewportOffset();
      setViewportOffset(offset);
      // Update pan position if not currently panning and already initialized
      if (panRef.current && !isPanningRef.current && initializedRef.current) {
        panRef.current.setPanPosition(offset.offsetX, offset.offsetY, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, imageBounds?.containerWidth, imageBounds?.containerHeight, imageBounds?.left, imageBounds?.top, coordinateMapper.isReady]);

  // Initialize pan state when mobile mode is first enabled
  useEffect(() => {
    if (isMounted && !initializedRef.current && viewportOffset.offsetX !== 0) {
      pan.setPanPosition(viewportOffset.offsetX, viewportOffset.offsetY, false);
      initializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, viewportOffset.offsetX, viewportOffset.offsetY]);

  // Calculate transform for mobile mode
  const transform = useMemo(() => {
    if (!isMounted) {
      return { scale: 1, translateX: 0, translateY: 0 };
    }

    // Use pan state if actively panning, otherwise use calculated viewport offset
    const translateX = pan.panState.isPanning || pan.panState.translateX !== 0 
      ? pan.panState.translateX 
      : viewportOffset.offsetX;
    const translateY = pan.panState.isPanning || pan.panState.translateY !== 0 
      ? pan.panState.translateY 
      : viewportOffset.offsetY;

    return {
      scale: mobileZoomScale,
      translateX,
      translateY,
    };
  }, [isMounted, mobileZoomScale, pan.panState, viewportOffset]);

  // Track which token is being dragged (if any)
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);

  // Handle token drag state changes
  const handleDragStateChange = useCallback((tokenId: string, isDragging: boolean) => {
    setDraggingTokenId(isDragging ? tokenId : null);
  }, []);

  // Pan handlers for mobile mode - improved touch support
  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const tokenElement = target.closest('[data-token]');
    if (tokenElement) {
      return; // Let token handle it
    }
    e.stopPropagation();
    setDraggingTokenId(null);
    pan.startPan(e.clientX, e.clientY);
    pan.trackInteraction();
  }, [pan]);

  const handleContainerTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle single touch - let multi-touch pass through for pinch zoom (if needed later)
    if (e.touches.length > 1) {
      return;
    }
    
    const target = e.target as HTMLElement;
    const tokenElement = target.closest('[data-token]');
    if (tokenElement) {
      return; // Let token handle it
    }
    
    e.preventDefault(); // Prevent scrolling and other default behaviors
    e.stopPropagation();
    
    const touch = e.touches[0];
    if (touch) {
      setDraggingTokenId(null);
      pan.startPan(touch.clientX, touch.clientY);
      pan.trackInteraction();
    }
  }, [pan]);

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (!pan.panState.isPanning || draggingTokenId) return;
    e.preventDefault();
    pan.updatePan(e.clientX, e.clientY);
    pan.trackInteraction();
  }, [pan, draggingTokenId]);

  const handleContainerTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pan.panState.isPanning || draggingTokenId) return;
    
    // Only handle single touch
    if (e.touches.length > 1) {
      pan.endPan();
      return;
    }
    
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    if (touch) {
      pan.updatePan(touch.clientX, touch.clientY);
      pan.trackInteraction();
    }
  }, [pan, draggingTokenId]);

  const handleContainerMouseUp = useCallback(() => {
    pan.endPan();
  }, [pan]);

  const handleContainerTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    pan.endPan();
  }, [pan]);

  const handleContainerTouchCancel = useCallback(() => {
    pan.endPan();
  }, [pan]);

  // Track interactions for inactivity timer
  const handleInteraction = useCallback(() => {
    pan.trackInteraction();
  }, [pan]);

  // Apply transform to wrapper for mobile mode
  const mapWrapperStyle = isMounted && transform.scale !== 1
    ? {
        transform: `scale(${transform.scale}) translate(${transform.translateX}px, ${transform.translateY}px)`,
        transformOrigin: 'center center',
        width: '100%',
        height: '100%',
        transition: pan.panState.isPanning ? 'none' : 'transform 0.5s ease-out',
      }
    : {};

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 m-0 p-0 overflow-hidden"
      onMouseDown={handleContainerMouseDown}
      onMouseMove={(e) => {
        if (pan.panState.isPanning && !draggingTokenId) {
          handleContainerMouseMove(e);
        }
      }}
      onMouseUp={handleContainerMouseUp}
      onMouseLeave={handleContainerMouseUp}
      onTouchStart={handleContainerTouchStart}
      onTouchMove={(e) => {
        if (pan.panState.isPanning && !draggingTokenId) {
          handleContainerTouchMove(e);
        }
      }}
      onTouchEnd={handleContainerTouchEnd}
      onTouchCancel={handleContainerTouchCancel}
      onClick={(e) => {
        // Prevent clicks on background
        if (
          e.target === e.currentTarget ||
          (e.target as HTMLElement).tagName === "IMG"
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
        handleInteraction();
      }}
      onMouseMoveCapture={handleInteraction}
      onTouchMoveCapture={handleInteraction}
      style={{ touchAction: "none" }}
    >
      <div style={mapWrapperStyle}>
        <MapImage onLoad={updateBounds} />
        {imageBounds && (
          <GridLines
            gridData={gridData}
            imageBounds={imageBounds}
            gridScale={settings.gridScale}
            gridOffsetX={settings.gridOffsetX}
            gridOffsetY={settings.gridOffsetY}
          />
        )}
        {imageBounds && myUserId && (
          <div data-token>
            <DraggableToken
              tokenId={myUserId}
              position={myPosition}
              color={myColor}
              imageBounds={imageBounds}
              worldMapWidth={worldMapWidth}
              worldMapHeight={worldMapHeight}
              gridData={gridData}
              gridScale={settings.gridScale}
              gridOffsetX={settings.gridOffsetX}
              gridOffsetY={settings.gridOffsetY}
              isMounted={isMounted}
              onPositionUpdate={updateTokenPosition}
              transform={transform}
              onDragStateChange={handleDragStateChange}
              zIndex={20}
            />
          </div>
        )}
        <TokenManager
          activeUsers={otherUsers}
          disconnectedUsers={disconnectedUsers}
          imageBounds={imageBounds}
          worldMapWidth={worldMapWidth}
          worldMapHeight={worldMapHeight}
          gridData={gridData}
          gridScale={settings.gridScale}
          gridOffsetX={settings.gridOffsetX}
          gridOffsetY={settings.gridOffsetY}
          isMounted={isMounted}
          isDisplay={false}
          myUserId={myUserId}
          onRemoveToken={removeToken}
          onPositionUpdate={updateTokenPosition}
          transform={transform}
          onDragStateChange={handleDragStateChange}
        />
      </div>
    </div>
  );
};
