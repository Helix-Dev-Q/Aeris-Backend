"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Palette, Check, Settings as SettingsIcon, Info, User } from "lucide-react";
import { useTheme } from "@/app/utils/hooks/theme";
import { Config } from "@/app/config/config";
import { useProfileStore } from "@/app/packages/zustand/profile";
import { useConfigStore } from "@/app/packages/zustand/configs";
import { themes } from "@/app/css/themes";
import axios from "axios";

export function ConsolidatedSettings() {
  const colors = useTheme();
  const profile = useProfileStore();
  const { theme: currentTheme, setTheme, editOnRelease, setEditOnRelease } = useConfigStore();
  const [showModal, setShowModal] = useState(false);
  const [applyingTheme, setApplyingTheme] = useState<string | null>(null);
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);
  const [backendProfile, setBackendProfile] = useState<any>(null);

  // Fetch profile from backend
  useEffect(() => {
    if (!profile.accountId) return;

    const fetchBackendProfile = async () => {
      try {
        const url = `${Config.LAUNCHER_API_URL}/api/user/profile/${profile.accountId}`;
        const response = await axios.get(url, { timeout: 5000 });
        setBackendProfile(response.data);
      } catch {
        // Backend unavailable or profile endpoint not found — use local profile data
      }
    };

    fetchBackendProfile();
  }, [profile.accountId]);

  const themeColors: Record<string, string> = {
    midnight: "#1e2749",
    obsidian: "#262626",
    deepocean: "#0d3a54",
    royalpurple: "#3d1f6b",
    lavender: "#4d3266",
    cobalt: "#243a6e",
    arctic: "#1d3847",
    forest: "#1f4029",
    matrix: "#153a15",
    ember: "#3d2415",
    crimson: "#441e2a",
    cyberpunk: "#2a1a4a",
    synthwave: "#3e1f5c",
    slate: "#242d38",
  };

  const themeNames: Record<string, string> = {
    midnight: "Midnight",
    obsidian: "Obsidian",
    deepocean: "Deep Ocean",
    royalpurple: "Royal Purple",
    lavender: "Lavender",
    cobalt: "Cobalt",
    arctic: "Arctic",
    forest: "Forest",
    matrix: "Matrix",
    ember: "Ember",
    crimson: "Crimson",
    cyberpunk: "Cyberpunk",
    synthwave: "Synthwave",
    slate: "Slate",
  };

  const handleThemeClick = (themeName: string) => {
    setApplyingTheme(themeName);
    setTimeout(() => {
      setTheme(themeName);
      setApplyingTheme(null);
    }, 600);
  };

  return (
    <>
      <div className={`rounded-xl p-6 ${colors.current.background2} border ${colors.current.borderColor} space-y-8`}>
        
        {/* About Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Info size={24} className={colors.current.foreground} />
            <h2 className={`text-xl font-bold ${colors.current.foreground}`}>
             User
            </h2>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {(backendProfile?.discordAvatar || profile.discordAvatar) ? (
                <img 
                  src={backendProfile?.discordAvatar || profile.discordAvatar} 
                  className="w-16 h-16 rounded-full border-2 border-stone-700"
                  alt="Discord Avatar"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'w-16 h-16 rounded-full bg-stone-700 flex items-center justify-center';
                    fallback.innerHTML = '<svg class="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                    target.parentNode?.insertBefore(fallback, target);
                  }}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-stone-700 flex items-center justify-center">
                  <User size={32} className="text-stone-400" />
                </div>
              )}
              <div>
                <h2 className={`text-xl font-bold ${colors.current.foreground}`}>
                  {backendProfile?.displayName || profile.displayName || "Guest User"}
                </h2>
                <p className={`text-sm ${colors.current.foreground2}`}>
                  {(backendProfile?.discordId || profile.discordId) ? `Discord User: ${backendProfile?.displayName || profile.displayName}` : "Please log in with Discord"}
                </p>
                {(backendProfile?.discordId || profile.discordId) && (
                  <>
                    <p className={`text-xs ${colors.current.foreground2} mt-1`}>
                      ID: {backendProfile?.discordId || profile.discordId}
                    </p>
                    {backendProfile?.avatarHash && (
                      <p className={`text-xs ${colors.current.foreground2} mt-1`}>
                        Avatar Hash: {backendProfile.avatarHash}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${colors.current.buttonColor} ${colors.current.buttonHover} ${colors.current.foreground} transition-colors`}
            >
              <LogOut size={18} />
              <span className="font-medium">Log Out</span>
            </motion.button>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette size={24} className={colors.current.foreground} />
            <h2 className={`text-xl font-bold ${colors.current.foreground}`}>
              Appearance
            </h2>
          </div>
          <p className="text-white">Customize the launcher!</p>

          <div className="grid grid-cols-14 gap-4">
            {Object.keys(themes).map((themeName, index) => (
              <motion.div
                key={themeName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.03,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="relative"
              >
                <motion.button
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onHoverStart={() => setHoveredTheme(themeName)}
                  onHoverEnd={() => setHoveredTheme(null)}
                  onClick={() => handleThemeClick(themeName)}
                  className="w-12 h-12 rounded-full border-2 transition-all relative"
                  style={{
                    backgroundColor: themeColors[themeName],
                    borderColor:
                      currentTheme === themeName
                        ? "#ffffff"
                        : `${themeColors[themeName]}80`,
                    boxShadow:
                      currentTheme === themeName
                        ? `0 0 20px ${themeColors[themeName]}80`
                        : "none",
                  }}
                >
                  <AnimatePresence>
                    {currentTheme === themeName && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-lg"
                      >
                        <Check size={12} className="text-black" strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>

                <AnimatePresence>
                  {hoveredTheme === themeName && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 px-3 py-1.5 mb-3 bg-black/90 text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none z-10"
                    >
                      {themeNames[themeName]}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SettingsIcon size={24} className={colors.current.foreground} />
            <h2 className={`text-xl font-bold ${colors.current.foreground}`}>
              Settings
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-medium ${colors.current.foreground}`}>
                  Edit on Release
                </h3>
                <p className={`text-sm ${colors.current.foreground2}`}>
                  Enable editing when game is released
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditOnRelease(!editOnRelease)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  editOnRelease ? "bg-green-500" : "bg-gray-500"
                }`}
              >
                <motion.div
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                  animate={{
                    x: editOnRelease ? 25 : 4,
                  }}
                  transition={{ duration: 0.2 }}
                />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`rounded-2xl p-8 w-[400px] ${colors.current.background2} border ${colors.current.borderColor} text-center shadow-xl`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2
                className={`text-2xl font-bold mb-4 ${colors.current.foreground}`}
              >
                Confirm Logout
              </h2>
              <p className={`text-sm mb-6 ${colors.current.foreground2}`}>
                Are you sure you want to log out of {Config.NAME}?
              </p>
              <div className="flex justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 rounded-lg ${colors.current.buttonColor} ${colors.current.foreground} transition-colors`}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowModal(false);
                    profile.logout();
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Log Out
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme Applying Modal */}
      <AnimatePresence>
        {applyingTheme && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bg-black/20 backdrop-blur-sm z-20 w-screen h-screen inset-0 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`px-6 py-3 text-white text-sm font-medium rounded-xl ${colors.current.background2} border ${colors.current.borderColor} shadow-2xl`}
            >
              Applying...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ConsolidatedSettings;
