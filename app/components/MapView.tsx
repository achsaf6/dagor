"use client";

import React from "react";
import { useViewMode } from "../hooks/useViewMode";
import { MapViewDisplay } from "./MapViewDisplay";
import { MapViewMobile } from "./MapViewMobile";

export const MapView = () => {
  const { isMobile, isDisplay } = useViewMode();

  if (isDisplay) {
    return <MapViewDisplay />;
  }

  if (isMobile) {
    return <MapViewMobile />;
  }

  // Default to display mode during SSR/hydration
  return <MapViewDisplay />;
};

