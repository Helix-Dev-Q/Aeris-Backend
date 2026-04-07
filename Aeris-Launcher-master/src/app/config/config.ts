type Config = {
  NAME: string;
  VERSION: string;
  BACKEND_URL: string;
  BACKEND_PORT: string;
  LAUNCHER_API_URL: string;
  NEWS_API_URL: string;
  SHOP_API_URL: string;
  CURRENT_SEASON: string;
  CURRENT_VERSION: string;
  ALLOW_ALL_VERSIONS: string;
  REDIRECT_DOWNLOAD: string;
  PAKS_ENABLED: string;
  PAKS_LINK: string;
  PAKS_AND_SIGS_LINKS: string;
  THEME: string;
  DISCORD_LINK: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  BACKEND_STRING: string;
  USE_BACKEND_PARAM: string;
  INJECT_OTHER_DLLS: string;
  INJECT_OTHER_DLLS_LINK: string;
  AUTH_KEY: string;
  DONATION_LINK: string;
};

type Library = {
  KEY: string;
};

const BACKEND = process.env.NEXT_PUBLIC_LAUNCHER_BACKEND_URL ?? "";

export const Config: Config = {
  NAME:                 process.env.NEXT_PUBLIC_LAUNCHER_NAME ?? "",
  VERSION:              process.env.NEXT_PUBLIC_LAUNCHER_VERSION ?? "",
  BACKEND_URL:          BACKEND,
  BACKEND_PORT:         process.env.NEXT_PUBLIC_LAUNCHER_BACKEND_PORT ?? "",
  LAUNCHER_API_URL:     BACKEND,
  NEWS_API_URL:         BACKEND,
  SHOP_API_URL:         BACKEND,
  CURRENT_SEASON:       process.env.NEXT_PUBLIC_LAUNCHER_SEASON ?? "",
  CURRENT_VERSION:      process.env.NEXT_PUBLIC_LAUNCHER_CURRENT_VERSION ?? "",
  ALLOW_ALL_VERSIONS:   process.env.NEXT_PUBLIC_LAUNCHER_ALLOW_ALL_VERSIONS?.toLowerCase() ?? "false",
  REDIRECT_DOWNLOAD:    process.env.NEXT_PUBLIC_LAUNCHER_REDIRECT_DOWNLOAD ?? "",
  PAKS_ENABLED:         process.env.NEXT_PUBLIC_LAUNCHER_PAKS_ENABLED ?? "false",
  PAKS_LINK:            process.env.NEXT_PUBLIC_LAUNCHER_PAKS_LINK ?? "",
  PAKS_AND_SIGS_LINKS:  process.env.NEXT_PUBLIC_LAUNCHER_PAKS_AND_SIGS_LINKS ?? "",
  THEME:                process.env.NEXT_PUBLIC_LAUNCHER_THEME?.toLowerCase() ?? "default",
  DISCORD_LINK:         process.env.NEXT_PUBLIC_LAUNCHER_DISCORD_LINK ?? "",
  CLIENT_ID:            "fortnite",
  CLIENT_SECRET:        "fortnite",
  BACKEND_STRING:       process.env.NEXT_PUBLIC_LAUNCHER_BACKEND_FULL_URL?.toLowerCase() ?? "default",
  USE_BACKEND_PARAM:    process.env.NEXT_PUBLIC_LAUNCHER_USE_BACKEND_PARAMATER?.toLowerCase() ?? "true",
  INJECT_OTHER_DLLS:    process.env.NEXT_PUBLIC_LAUNCHER_INJECT_OTHER_DLLS?.toLowerCase() ?? "true",
  INJECT_OTHER_DLLS_LINK: process.env.NEXT_PUBLIC_LAUNCHER_INJECT_OTHER_DLLS_LINK ?? "",
  AUTH_KEY:             process.env.NEXT_PUBLIC_LAUNCHER_AUTH_KEY ?? "",
  DONATION_LINK:        process.env.NEXT_PUBLIC_LAUNCHER_DONATION_LINK ?? "",
};

export const LibraryConfig: Library = {
  KEY: "storage:library",
};
