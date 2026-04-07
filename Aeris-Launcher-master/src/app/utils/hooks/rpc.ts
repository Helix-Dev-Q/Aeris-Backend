import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef } from "react";

import { Config } from "@/app/config/config";

const RPC_CONFIG_URL = `${Config.BACKEND_URL}/api/rpc/config`;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export function useDiscordRPC() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;

    async function init(attempt = 0) {
      try {
        const res = await fetch(RPC_CONFIG_URL);
        if (!res.ok) return;
        const { clientId } = await res.json();
        if (!clientId) return;
        await invoke("start_rpc", { clientId });
        started.current = true;
        console.log("[RPC] Discord Rich Presence started");
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          setTimeout(() => init(attempt + 1), RETRY_DELAY_MS);
        } else {
          console.warn("[RPC] Could not start Discord RPC after retries:", err);
        }
      }
    }

    init();
    // intentionally no cleanup — Rust keeps the connection alive for the app lifetime
  }, []);
}
