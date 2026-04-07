"use client";

import { invoke } from "@tauri-apps/api/core";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { useProfileStore } from "@/app/packages/zustand/profile";
import { Window } from "@tauri-apps/api/window";
import { useConfigStore } from "@/app/packages/zustand/configs";
import { useLibraryStore } from "@/app/packages/zustand/library";
import { Build } from "../types/library";
import { Config } from "@/app/config/config";

const appWindow = new Window("main");

const parseBoolean = (value: string | undefined): boolean => value === "true";

export const start = async (buildPath: string): Promise<boolean> => {
  const currentLib = useLibraryStore.getState();
  const profile = useProfileStore.getState();
  const config = useConfigStore.getState();

  const build: Build | undefined = currentLib.entries.get(buildPath);
  if (!build) {
    console.error(`[Launch Failed] No build found at path: ${buildPath}`);
    return false;
  }

  // Wait for hydration if needed
  if (!profile.hydrated) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!useProfileStore.getState().hydrated) {
      console.error(`[Launch Blocked] Profile store not hydrated.`);
      return false;
    }
  }

  if (!profile.validSession()) {
    console.error(`[Launch Blocked] User is not authenticated.`);
    return false;
  }

  try {
    const normalizedPath = buildPath.replace("/", "\\");
    const gameDirectory = `${normalizedPath}\\FortniteGame`;
    const executable = `${gameDirectory}\\Binaries\\Win64\\FortniteClient-Win64-Shipping.exe`;

    const fileExists = await invoke<boolean>("exists", { path: executable });
    if (!fileExists) {
      console.error(`[Invalid Build] Executable missing for version ${build.version}`);
      return false;
    }

    // Build valid credentials — Discord users may have null email/password
    const launchEmail =
      (profile.email && profile.email !== 'null')
        ? profile.email
        : `${(profile.displayName || profile.accountId || 'user').replace(/\s+/g, '')}@discord.local`;

    const launchPassword =
      (profile.password && profile.password !== 'null')
        ? profile.password
        : `discord_${profile.discordId || profile.accountId}`;

    // Build extra DLL list — append EOR dll if editOnRelease is enabled
    const EOR_DLL = "https://github.com/Jaruwyd/Edit-On-Release/raw/refs/heads/download/EOR%20By%20Jaruwyd.dll";
    const baseDlls = Config.INJECT_OTHER_DLLS_LINK || '';
    const extraDllLinks = config.editOnRelease
      ? [baseDlls, EOR_DLL].filter(Boolean).join(",")
      : baseDlls;

    // Inject if the toggle is enabled AND we have links
    const injectEnabled = parseBoolean(Config.INJECT_OTHER_DLLS);
    const shouldInject = injectEnabled && extraDllLinks.trim().length > 0;

    console.log(`[DLL Inject] enabled=${injectEnabled}, links="${extraDllLinks}", shouldInject=${shouldInject}`);

    await invoke("launch", {
      filePath: executable,
      email: launchEmail,
      password: launchPassword,
      redirectLink: Config.REDIRECT_DOWNLOAD,
      backend: Config.BACKEND_STRING,
      useBackendParam: parseBoolean(Config.USE_BACKEND_PARAM) || false,
      injectExtraDlls: shouldInject,
      extraDllLinks: extraDllLinks,
    });

    currentLib.patch(build.version, { open: true });

    if (config.minimizeOnLaunch) {
      appWindow.minimize();
    }

    sendNotification({
      title: "Starting!",
      body: `${Config.NAME} is now launching. Enjoy your experience!`,
    });

    return true;
  } catch (err) {
    console.error(`[Launch Error]`, err);
    return false;
  }
};
