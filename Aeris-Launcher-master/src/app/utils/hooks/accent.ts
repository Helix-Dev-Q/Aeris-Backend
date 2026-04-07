"use client";

import { useConfigStore } from "@/app/packages/zustand/configs";

/** Returns accent color and helpers derived from it */
export function useAccent() {
  const accentColor = useConfigStore((s) => s.accentColor) ?? "#7c3aed";

  // Parse hex to r,g,b for rgba usage
  const hex = accentColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) || 124;
  const g = parseInt(hex.substring(2, 4), 16) || 58;
  const b = parseInt(hex.substring(4, 6), 16) || 237;

  const rgba = (alpha: number) => `rgba(${r},${g},${b},${alpha})`;

  // A lighter tint for text/icons
  const light = accentColor;

  return { accent: accentColor, rgba, light };
}
