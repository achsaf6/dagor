import { useState, useEffect, RefObject } from "react";
import { ImageBounds } from "../types";
import { calculateImageBounds } from "../utils/imageBounds";

export const useImageBounds = (containerRef: RefObject<HTMLDivElement | null>) => {
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null);

  const updateBounds = () => {
    if (!containerRef.current) return;
    const bounds = calculateImageBounds(containerRef.current);
    if (bounds) {
      setImageBounds(bounds);
    }
  };

  useEffect(() => {
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
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
    }

    // Also recalculate after image loads
    const img = containerRef.current?.querySelector("img");
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
      if (resizeObserver && containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver?.disconnect();
      if (img) {
        img.removeEventListener("load", updateBounds);
      }
    };
  }, []);

  return { imageBounds, updateBounds };
};

