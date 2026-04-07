"use client";

import { useEffect } from "react";
import { Bricolage_Grotesque } from "next/font/google";
import "@/app/css/app.css";
import { Titlebar } from "@/app/components/titlebar";
import { Snow } from "@/app/components/Snow";
import { ClickSound } from "@/app/components/ClickSound";
import { FPSCounter } from "@/app/components/FPSCounter";
import { CommandPalette } from "@/app/components/CommandPalette";
import { useProfileStore } from "./packages/zustand/profile";
import { useTheme } from "./utils/hooks/theme";
import { useConfigStore } from "./packages/zustand/configs";
import { useDiscordRPC } from "./utils/hooks/rpc";

const Bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const accountId = useProfileStore((state) => state.accountId);
  const displayName = useProfileStore((state) => state.displayName);
  const colors = useTheme();
  const { snowyBackground, theme, uiOpacity, hideTitlebarButtons } = useConfigStore();
  const isBlackhole = theme === "blackhole";
  useDiscordRPC();

  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  return (
    <html lang="en">
      <body
        className={`${Bricolage.variable} antialiased w-screen h-screen flex flex-col ${colors.current.background}`}
        style={{
          ...(isBlackhole ? { outline: "1px solid rgba(255,255,255,0.2)", outlineOffset: "-1px" } : {}),
          opacity: uiOpacity,
        }}
      >
        {snowyBackground && <Snow />}
        <ClickSound />
        <FPSCounter />
        <CommandPalette />
        {/* Titlebar sits at very top for window dragging/controls */}
        <Titlebar loggedIn={true} hideButtons={hideTitlebarButtons} />
        <div className="flex-1 overflow-hidden relative" style={{ marginTop: "0" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
