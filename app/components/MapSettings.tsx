"use client";

import { useState, useRef, useEffect } from "react";
import { GridSizeSlider } from "./GridSizeSlider";
import { GridOffsetJoystick } from "./GridOffsetJoystick";

interface MapSettingsProps {
  gridScale: number;
  onGridScaleChange: (value: number) => void;
  gridOffsetX: number;
  gridOffsetY: number;
  onGridOffsetChange: (x: number, y: number) => void;
}

export const MapSettings = ({
  gridScale,
  onGridScaleChange,
  gridOffsetX,
  gridOffsetY,
  onGridOffsetChange,
}: MapSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="fixed top-4 right-4 z-50">
      {/* Dropdown Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-white/20 text-white text-sm font-medium hover:bg-black/90 transition-colors"
      >
        Map Settings
        <span className="ml-2">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div 
          className="mt-2 bg-black/80 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-white/20 min-w-[280px]"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white text-sm font-semibold mb-4">Settings</h3>
          
          {/* Grid Size Slider */}
          <div className="mb-4">
            <GridSizeSlider
              value={gridScale}
              onChange={onGridScaleChange}
            />
          </div>

          {/* Grid Offset Joystick */}
          <div className="mb-4">
            <GridOffsetJoystick
              offsetX={gridOffsetX}
              offsetY={gridOffsetY}
              onChange={onGridOffsetChange}
            />
          </div>

          {/* Add more settings here in the future */}
        </div>
      )}
    </div>
  );
};

