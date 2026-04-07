export interface ConfigState {
  minimizeOnLaunch: boolean;
  theme: string;
  editOnRelease: boolean;
  snowyBackground: boolean;
  soundOnClick: boolean;
  soundOption: "none" | "click" | "soft" | "pop" | "snap" | "typewriter";
  glossyBackground: boolean;
  showFPS: boolean;
  compactSidebar: boolean;
  fpsMultiplier: number;

  // Appearance extras
  uiOpacity: number;
  accentColor: string;
  animationSpeed: "none" | "normal" | "fast";
  sidebarBlur: number;
  hideTitlebarButtons: boolean;
  bubbleBuilds: boolean;

  setMinimizeOnLaunch: (value: boolean) => void;
  toggleMinimizeOnLaunch: () => void;
  setTheme: (theme: string) => void;
  setEditOnRelease: (value: boolean) => void;
  toggleEditOnRelease: () => void;
  setSnowyBackground: (value: boolean) => void;
  setSoundOnClick: (value: boolean) => void;
  setSoundOption: (value: "none" | "click" | "soft" | "pop" | "snap" | "typewriter") => void;
  setGlossyBackground: (value: boolean) => void;
  setShowFPS: (value: boolean) => void;
  setCompactSidebar: (value: boolean) => void;
  setFpsMultiplier: (value: number) => void;
  setUiOpacity: (value: number) => void;
  setAccentColor: (value: string) => void;
  setAnimationSpeed: (value: "none" | "normal" | "fast") => void;
  setSidebarBlur: (value: number) => void;
  setHideTitlebarButtons: (value: boolean) => void;
  setBubbleBuilds: (value: boolean) => void;
}
