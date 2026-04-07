"use client";

import { useConfigStore } from "@/app/packages/zustand/configs";

export function VideoBackground() {
  const theme = useConfigStore((s) => s.theme);
  if (theme !== "blackhole") return null;

  return (
    <video
      src="/1000320.mp4"
      autoPlay
      loop
      muted
      playsInline
      className="fixed inset-0 w-full h-full object-cover pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
