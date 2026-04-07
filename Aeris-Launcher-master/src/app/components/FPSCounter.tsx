"use client";

import { useEffect, useRef, useState } from "react";
import { useConfigStore } from "@/app/packages/zustand/configs";

export function FPSCounter() {
  const showFPS = useConfigStore((s) => s.showFPS);
  const fpsMultiplier = useConfigStore((s) => s.fpsMultiplier);
  const [fps, setFps] = useState(0);
  const frameRef = useRef<number>(0);
  const lastRef = useRef<number>(performance.now());
  const countRef = useRef<number>(0);

  useEffect(() => {
    if (!showFPS) return;

    const loop = (now: number) => {
      countRef.current++;
      if (now - lastRef.current >= 1000) {
        setFps(countRef.current);
        countRef.current = 0;
        lastRef.current = now;
      }
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [showFPS]);

  if (!showFPS) return null;

  const displayed = Math.round(fps * fpsMultiplier);
  const color = displayed >= 60 ? "#4ade80" : displayed >= 30 ? "#facc15" : "#f87171";

  return (
    <div
      className="fixed bottom-4 left-4 z-[9999] pointer-events-none select-none"
      style={{
        fontFamily: "monospace",
        fontSize: "11px",
        fontWeight: 700,
        color,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        padding: "3px 8px",
        borderRadius: "6px",
        border: `1px solid ${color}30`,
        letterSpacing: "0.05em",
      }}
    >
      {displayed} FPS
    </div>
  );
}
