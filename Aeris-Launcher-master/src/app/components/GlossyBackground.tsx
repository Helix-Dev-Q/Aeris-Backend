"use client";

import { useConfigStore } from "@/app/packages/zustand/configs";

export function GlossyBackground() {
  const glossyBackground = useConfigStore((s) => s.glossyBackground);
  if (!glossyBackground) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 50 }}>
      <div style={{
        position: "absolute", width: "600px", height: "600px",
        borderRadius: "50%", top: "-150px", left: "-150px",
        background: "radial-gradient(circle, rgba(120,80,255,0.35) 0%, transparent 70%)",
        filter: "blur(80px)",
        animation: "glossyMove1 8s ease-in-out infinite alternate",
      }} />
      <div style={{
        position: "absolute", width: "500px", height: "500px",
        borderRadius: "50%", bottom: "-100px", right: "-100px",
        background: "radial-gradient(circle, rgba(80,160,255,0.3) 0%, transparent 70%)",
        filter: "blur(80px)",
        animation: "glossyMove2 10s ease-in-out infinite alternate",
      }} />
      <div style={{
        position: "absolute", width: "400px", height: "400px",
        borderRadius: "50%", top: "30%", left: "40%",
        background: "radial-gradient(circle, rgba(200,80,255,0.2) 0%, transparent 70%)",
        filter: "blur(70px)",
        animation: "glossyMove3 12s ease-in-out infinite alternate",
      }} />
      {/* Sheen */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 60%, rgba(255,255,255,0.04) 100%)",
      }} />
    </div>
  );
}
