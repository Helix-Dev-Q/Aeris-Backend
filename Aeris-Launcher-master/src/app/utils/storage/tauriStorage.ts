import { StateStorage } from "zustand/middleware";

/**
 * Creates a zustand-compatible StateStorage that uses Tauri's store plugin
 * when running inside Tauri, and falls back to localStorage in the browser/Next.js SSR.
 */
export function createTauriStorage(): StateStorage {
  return {
    getItem: async (name: string): Promise<string | null> => {
      if (typeof window === "undefined") return null;

      try {
        // Try Tauri store plugin (tauri-plugin-store)
        const { Store } = await import("@tauri-apps/plugin-store");
        const store = await Store.load("launcher.json", { defaults: {} });
        const value = await store.get<string>(name);
        return value ?? null;
      } catch {
        // Fall back to localStorage (browser / dev mode)
        return localStorage.getItem(name);
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      if (typeof window === "undefined") return;

      try {
        const { Store } = await import("@tauri-apps/plugin-store");
        const store = await Store.load("launcher.json", { defaults: {} });
        await store.set(name, value);
      } catch {
        localStorage.setItem(name, value);
      }
    },

    removeItem: async (name: string): Promise<void> => {
      if (typeof window === "undefined") return;

      try {
        const { Store } = await import("@tauri-apps/plugin-store");
        const store = await Store.load("launcher.json", { defaults: {} });
        await store.delete(name);
      } catch {
        localStorage.removeItem(name);
      }
    },
  };
}
