"use client";

import { useEffect } from "react";
import { useProfileStore } from "@/app/packages/zustand/profile";
import { useRouter } from "next/navigation";
import { Config } from "@/app/config/config";
import { motion } from "framer-motion";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const profile = useProfileStore();
  const router = useRouter();

  useEffect(() => {
    async function check() {
      if (!profile.hydrated) { onDone(); return; }
      if (!profile.accountId || !profile.email) { onDone(); return; }

      try {
        const res = await fetch(
          `${Config.LAUNCHER_API_URL}/api/user/profile/${profile.accountId}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.banned) {
            profile.setProfile({ isBanned: true });
            router.replace("/banned");
            return;
          }
        }
      } catch { /* backend unreachable, continue */ }

      onDone();
    }

    const t = setTimeout(check, 600);
    return () => clearTimeout(t);
  }, [profile.hydrated]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: "#080810" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <img src="/AerisMP.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: "rgba(255,255,255,0.08)", borderTopColor: "rgba(255,255,255,0.5)" }} />
          <p className="text-white/30 text-xs tracking-widest uppercase">Loading Content...</p>
        </div>
      </div>
    </motion.div>
  );
}
