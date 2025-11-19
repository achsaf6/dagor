import { useState, useEffect, useCallback, RefObject } from "react";
import { ImageBounds } from "../types";
import { calculateImageBounds } from "../utils/imageBounds";

export const useImageBounds = (containerRef: RefObject<HTMLDivElement | null>) => {
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null);

  const updateBounds = useCallback(() => {
    if (!containerRef.current) return;
    const bounds = calculateImageBounds(containerRef.current);
    if (bounds) {
      setImageBounds(bounds);
    }
  }, [containerRef]);

  useEffect(() => {
    // Capture ref value for cleanup
    const container = containerRef.current;
    
    // Calculate image bounds on mount and resize
    // Use a small delay to ensure image is rendered
    const timeoutId = setTimeout(updateBounds, 100);

    const handleResize = () => {
      updateBounds();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    const visualViewport = typeof window !== "undefined" ? window.visualViewport : null;
    if (visualViewport) {
      visualViewport.addEventListener("resize", handleResize);
      visualViewport.addEventListener("scroll", handleResize);
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof window !== "undefined" && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      if (container) {
        resizeObserver.observe(container);
      }
    }

    // Also recalculate after image loads
    const img = container?.querySelector("img");
    if (img) {
      if (img.complete) {
        updateBounds();
      } else {
        img.addEventListener("load", updateBounds);
      }
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (visualViewport) {
        visualViewport.removeEventListener("resize", handleResize);
        visualViewport.removeEventListener("scroll", handleResize);
      }
      if (resizeObserver && container) {
        resizeObserver.unobserve(container);
      }
      resizeObserver?.disconnect();
      if (img) {
        img.removeEventListener("load", updateBounds);
      }
    };
  }, [containerRef, updateBounds]);

  return { imageBounds, updateBounds };
};

