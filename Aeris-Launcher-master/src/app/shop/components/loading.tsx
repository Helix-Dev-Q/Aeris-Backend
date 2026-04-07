"use client";

// loading.tsx
import { useTheme } from "@/app/utils/hooks/theme";

export function ShopLoading() {
  const { current: colors } = useTheme();

  return (
    <div className={`flex items-center justify-center h-full ${colors.background}`}>
      <div className="flex flex-col items-center gap-2.5">
        <div className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            borderTopColor: "rgba(255,255,255,0.45)",
          }} />
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          Loading shop…
        </p>
      </div>
    </div>
  );
}
