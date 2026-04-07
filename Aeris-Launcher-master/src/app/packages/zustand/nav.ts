import { create } from "zustand";
import type { View } from "@/app/utils/types/views";

interface NavStore {
  pendingView: View | null;
  navigateTo: (v: View) => void;
  clearPending: () => void;
}

export const useNavStore = create<NavStore>((set) => ({
  pendingView: null,
  navigateTo: (v) => set({ pendingView: v }),
  clearPending: () => set({ pendingView: null }),
}));
