"use client";

import { Minus, X } from "lucide-react";
import { Window } from "@tauri-apps/api/window";

const appWindow = new Window("main");

export function Titlebar({ loggedIn, hideButtons }: { loggedIn?: boolean; hideButtons?: boolean }) {
  return (
    <div
      className="absolute top-0 left-0 right-0 h-8 flex items-center justify-end px-2 gap-1 select-none"
      style={{ zIndex: 300 }}
      data-tauri-drag-region
    >
      {!hideButtons && (
        <div className="flex items-center gap-0.5 relative z-10">
          <button
            onClick={() => appWindow.minimize()}
            className="w-7 h-6 rounded-md flex items-center justify-center transition-all duration-100"
            style={{ color: "rgba(255,255,255,0.25)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Minus size={11} />
          </button>
          <button
            onClick={() => appWindow.close()}
            className="w-7 h-6 rounded-md flex items-center justify-center transition-all duration-100"
            style={{ color: "rgba(255,255,255,0.25)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.7)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.25)"; }}
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
