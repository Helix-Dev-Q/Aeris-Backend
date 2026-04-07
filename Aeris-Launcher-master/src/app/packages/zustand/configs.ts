import { ConfigState } from "@/app/utils/types/config";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createTauriStorage } from "@/app/utils/storage/tauriStorage";

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      minimizeOnLaunch: false,
      theme: "midnight",
      editOnRelease: false,
      snowyBackground: false,
      soundOnClick: false,
      soundOption: "click",
      glossyBackground: false,
      showFPS: false,
      compactSidebar: false,
      fpsMultiplier: 1,
      uiOpacity: 1,
      accentColor: "#7c3aed",
      animationSpeed: "normal",
      sidebarBlur: 12,
      hideTitlebarButtons: false,
      bubbleBuilds: false,

      setMinimizeOnLaunch: (value) => set({ minimizeOnLaunch: value }),
      toggleMinimizeOnLaunch: () =>
        set((state) => ({ minimizeOnLaunch: !state.minimizeOnLaunch })),
      setTheme: (theme) => set({ theme }),
      setEditOnRelease: (value) => set({ editOnRelease: value }),
      toggleEditOnRelease: () =>
        set((state) => ({ editOnRelease: !state.editOnRelease })),
      setSnowyBackground: (value) => set({ snowyBackground: value }),
      setSoundOnClick: (value) => set({ soundOnClick: value }),
      setSoundOption: (value) => set({ soundOption: value }),
      setGlossyBackground: (value) => set({ glossyBackground: value }),
      setShowFPS: (value) => set({ showFPS: value }),
      setCompactSidebar: (value) => set({ compactSidebar: value }),
      setFpsMultiplier: (value) => set({ fpsMultiplier: value }),
      setUiOpacity: (value) => set({ uiOpacity: value }),
      setAccentColor: (value) => set({ accentColor: value }),
      setAnimationSpeed: (value) => set({ animationSpeed: value }),
      setSidebarBlur: (value) => set({ sidebarBlur: value }),
      setHideTitlebarButtons: (value) => set({ hideTitlebarButtons: value }),
      setBubbleBuilds: (value) => set({ bubbleBuilds: value }),
    }),
    {
      name: "storage:config",
      storage: createJSONStorage(() => createTauriStorage()),
    }
  )
);
