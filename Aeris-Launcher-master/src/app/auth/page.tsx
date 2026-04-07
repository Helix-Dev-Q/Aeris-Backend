"use client";

import { useState } from "react";
import { Config } from "../config/config";
import axios from "axios";
import { useProfileStore } from "@/app/packages/zustand/profile";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Auth() {
  const profile = useProfileStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeData, setWelcomeData] = useState<{ name: string; avatar: string | null }>({ name: "", avatar: null });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();

  const doLogin = (data: any) => {
    profile.login({ accountId: data.accountId, displayName: data.displayName, email, password, discordId: data.discordId, discordAvatar: data.discordAvatar });
    profile.setProfile({ lastUsernameChange: data.lastUsernameChange ?? null, isBanned: false });
    setWelcomeData({ name: data.displayName, avatar: data.discordAvatar });
    setShowWelcome(true);
    setTimeout(() => router.replace("/"), 1200);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    profile.setProfile({ isBanned: false });
    try {
      const res = await axios.post(`${Config.LAUNCHER_API_URL}/api/user/login`, { email, password }, { timeout: 8000 });
      const d = res.data;
      const accountId = d.accountId || `user_${Date.now()}`;
      let profileData = d;
      try {
        const pr = await axios.get(`${Config.LAUNCHER_API_URL}/api/user/profile/${accountId}`, { timeout: 8000 });
        profileData = { ...d, ...pr.data };
      } catch {}
      doLogin({ accountId, displayName: profileData.displayName || profileData.username || email.split("@")[0], discordId: profileData.discordId || null, discordAvatar: profileData.discordAvatar || null, banned: profileData.banned ?? false, lastUsernameChange: profileData.lastUsernameChange ?? null });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) setError("Your account has been banned.");
      else if (status === 401 || status === 404 || status === 400) setError("Invalid email or password.");
      else if (!err?.response) setError("Cannot reach the server.");
      else setError(err?.response?.data?.message || "Login failed.");
      setLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#080810" }}>

      {/* Background image */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <img
          src="https://s1.directupload.eu/images/260323/g7hjpxum.png"
          className="w-full h-full object-cover object-center"
          alt=""
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(8,8,16,0.15) 0%, rgba(8,8,16,0.5) 50%, rgba(8,8,16,0.97) 100%)" }} />
      </motion.div>

      {/* Login panel */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 flex flex-col justify-center"
        style={{ width: 400, padding: "0 48px", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      >
        {/* Logo */}
        <motion.div
          className="flex flex-col items-center mb-10"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-4" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <img src="/AerisMP.png" alt="AerisMP" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight">{Config.NAME}</h1>
          <p className="text-white/30 text-sm mt-1">Sign in to continue</p>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          {/* Email */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <div
              className="relative transition-all duration-200"
              style={{
                borderRadius: 12,
                border: `1px solid ${focusedField === "email" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                background: focusedField === "email" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
              }}
            >
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                className="w-full px-4 py-3.5 bg-transparent text-white text-sm placeholder-white/20 outline-none"
                style={{ borderRadius: 12 }}
              />
            </div>
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
          >
            <div
              className="relative transition-all duration-200"
              style={{
                borderRadius: 12,
                border: `1px solid ${focusedField === "password" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                background: focusedField === "password" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
              }}
            >
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                className="w-full px-4 py-3.5 bg-transparent text-white text-sm placeholder-white/20 outline-none"
                style={{ borderRadius: 12 }}
              />
            </div>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                className="text-red-400 text-xs px-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Button */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              className="w-full py-3.5 text-sm font-semibold transition-all duration-200 mt-1"
              style={{
                borderRadius: 12,
                background: loading ? "rgba(255,255,255,0.06)" : "#fff",
                color: loading ? "rgba(255,255,255,0.2)" : "#08080f",
                cursor: loading ? "not-allowed" : "pointer",
                border: "none",
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.4)" }} />
                  <span>Signing in...</span>
                </div>
              ) : "Sign In"}
            </motion.button>
          </motion.div>
        </form>

        {/* Footer */}
        <motion.p
          className="text-white/20 text-xs text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Need help?{" "}
          <a href={Config.DISCORD_LINK} className="text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">
            Join Discord
          </a>
        </motion.p>
      </motion.div>

      {/* Welcome overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(8,8,16,0.9)", backdropFilter: "blur(20px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex flex-col items-center gap-4 text-center"
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative">
                {welcomeData.avatar
                  ? <img src={welcomeData.avatar} referrerPolicy="no-referrer" className="w-20 h-20 rounded-2xl object-cover" style={{ border: "1px solid rgba(255,255,255,0.1)" }} alt="" />
                  : <div className="w-20 h-20 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}><img src="/AerisMP.png" className="w-full h-full object-cover" alt="" /></div>
                }
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-[#080810]" />
              </div>
              <div>
                <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Welcome back</p>
                <h1 className="text-4xl font-black text-white tracking-tight">{welcomeData.name}</h1>
              </div>
              <div className="w-32 h-px overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.1, ease: "linear" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
