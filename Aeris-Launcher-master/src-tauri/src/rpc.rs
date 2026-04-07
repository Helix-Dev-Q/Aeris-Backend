use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

// Global client kept alive for the duration of the app
static RPC_CLIENT: Mutex<Option<DiscordIpcClient>> = Mutex::new(None);

/// Start Discord Rich Presence with the given client ID.
/// Safe to call multiple times — reconnects if already running.
#[tauri::command]
pub fn start_rpc(client_id: String) -> Result<(), String> {
    let mut guard = RPC_CLIENT.lock().map_err(|e| e.to_string())?;

    // Close existing connection if any
    if let Some(ref mut old) = *guard {
        let _ = old.close();
    }

    let mut client =
        DiscordIpcClient::new(&client_id).map_err(|e| format!("RPC init error: {e}"))?;

    client
        .connect()
        .map_err(|e| format!("RPC connect error: {e}"))?;

    let start_ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let payload = activity::Activity::new()
        .state("In Launcher")
        .details("Playing The Best Project AerisMP  (Chapter 1 Season ))")
        .timestamps(activity::Timestamps::new().start(start_ts))
        .assets(
            activity::Assets::new()
                .large_image("AerisMP_logo")
                .large_text("AerisMP"),
        );

    client
        .set_activity(payload)
        .map_err(|e| format!("RPC set_activity error: {e}"))?;

    *guard = Some(client);
    Ok(())
}

/// Update the status line (e.g. when the user launches a game).
#[tauri::command]
pub fn update_rpc(state: String, details: String) -> Result<(), String> {
    let mut guard = RPC_CLIENT.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut client) = *guard {
        let start_ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        let payload = activity::Activity::new()
            .state(&state)
            .details(&details)
            .timestamps(activity::Timestamps::new().start(start_ts))
            .assets(
                activity::Assets::new()
                    .large_image("AerisMP_logo")
                    .large_text("AerisMP"),
            );

        client
            .set_activity(payload)
            .map_err(|e| format!("RPC update error: {e}"))?;
    }
    Ok(())
}

/// Cleanly disconnect RPC (call on app exit).
#[tauri::command]
pub fn stop_rpc() -> Result<(), String> {
    let mut guard = RPC_CLIENT.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut client) = *guard {
        client.close().map_err(|e| format!("RPC close error: {e}"))?;
    }
    *guard = None;
    Ok(())
}
