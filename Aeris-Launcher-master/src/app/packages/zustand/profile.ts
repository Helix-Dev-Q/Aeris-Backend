import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createTauriStorage } from "@/app/utils/storage/tauriStorage";
import { Profile } from "@/app/utils/types/profile";
import { Config } from "@/app/config/config";
import axios from "axios";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type ProfileStore = Profile;

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      accountId: null,
      displayName: null,
      username: null,
      email: null,
      password: null,
      discordId: null,
      discordAvatar: null,
      loginTime: null,
      hydrated: false,
      isBanned: false,
      banReason: undefined,
      ticketId: undefined,
      lastUsernameChange: null,
      role: null,
      usernameBypass: false,

      validSession: () => {
        const { accountId, loginTime } = get();
        if (!accountId || !loginTime) return false;
        return Date.now() - loginTime < SESSION_TTL_MS;
      },

      isSessionExpired: () => {
        const { loginTime } = get();
        if (!loginTime) return false;
        return Date.now() - loginTime >= SESSION_TTL_MS;
      },

      clearSession: () =>
        set({
          accountId: null,
          displayName: null,
          username: null,
          email: null,
          password: null,
          discordId: null,
          discordAvatar: null,
          loginTime: null,
          isBanned: false,
          banReason: undefined,
          ticketId: undefined,
          lastUsernameChange: null,
          role: null,
        }),

      clearAllData: () =>
        set({
          accountId: null,
          displayName: null,
          username: null,
          email: null,
          password: null,
          discordId: null,
          discordAvatar: null,
          loginTime: null,
          hydrated: false,
          isBanned: false,
          banReason: undefined,
          ticketId: undefined,
          lastUsernameChange: null,
          role: null,
          usernameBypass: false,
        }),

      login: ({ accountId, displayName, username, email, password, discordId, discordAvatar }) =>
        set({
          accountId,
          displayName,
          username: username ?? displayName,
          email,
          password,
          discordId: discordId ?? null,
          discordAvatar: discordAvatar ?? null,
          loginTime: Date.now(),
          isBanned: false,
        }),

      logout: () => get().clearSession(),

      setProfile: (partial) => set((state) => ({ ...state, ...partial })),

      clearProfile: () => get().clearSession(),

      setHydrated: () => set({ hydrated: true }),

      checkBanStatus: async () => {
        const { accountId } = get();
        if (!accountId) return;
        try {
          const res = await axios.get(
            `${Config.LAUNCHER_API_URL}/api/user/ban-status/${accountId}`,
            { timeout: 5000 }
          );
          const d = res.data;
          set({
            isBanned: d.banned ?? false,
            banReason: d.reason ?? undefined,
            ticketId: d.ticketId ?? undefined,
          });
        } catch {
          // silently ignore — don't clear ban status on network error
        }
      },

      submitAppeal: async (ticketId: string, appealText: string) => {
        const { accountId } = get();
        if (!accountId) return;
        await axios.post(
          `${Config.LAUNCHER_API_URL}/api/user/appeal`,
          { accountId, ticketId, appeal: appealText },
          { timeout: 8000 }
        );
      },
    }),
    {
      name: "storage:profile",
      storage: createJSONStorage(() => createTauriStorage()),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
      // Don't persist hydrated flag — it's always set fresh on load
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hydrated, validSession, isSessionExpired, clearSession, clearAllData, login, logout, setProfile, clearProfile, setHydrated, checkBanStatus, submitAppeal, ...rest } = state;
        return rest;
      },
    }
  )
);
