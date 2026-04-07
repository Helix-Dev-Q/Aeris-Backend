use std::{fs::File, io::Read, path::PathBuf};
use std::time::Duration;

use std::ffi::{CString, OsStr, OsString};
use std::mem::zeroed;
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::{Command, Stdio};
use std::{fs, io::Write};
use winapi::shared::windef::HWND;
use winapi::um::handleapi::CloseHandle;
use winapi::um::memoryapi::VirtualFreeEx;
use winapi::um::processthreadsapi::GetProcessId;
use winapi::um::shellapi::{ShellExecuteExA, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOA};
use winapi::um::tlhelp32::{
    CreateToolhelp32Snapshot, Thread32First, Thread32Next, TH32CS_SNAPTHREAD, THREADENTRY32,
};
use winapi::um::winbase::CREATE_SUSPENDED;
use winapi::um::processthreadsapi::ResumeThread;
use winapi::um::winnt::HANDLE;
use winapi::um::winnt::THREAD_SUSPEND_RESUME;
use winapi::um::winuser::SW_SHOW;
use winapi::um::{
    processthreadsapi::{OpenThread, SuspendThread},
    winnt::{
        PROCESS_CREATE_THREAD, PROCESS_QUERY_INFORMATION, PROCESS_VM_OPERATION, PROCESS_VM_READ,
        PROCESS_VM_WRITE,
    },
};
use winapi::{
    shared::minwindef::{DWORD, FALSE, LPVOID},
    um::{
        libloaderapi::{GetModuleHandleA, GetProcAddress},
        memoryapi::VirtualAllocEx,
        processthreadsapi::{CreateRemoteThread, OpenProcess},
        synchapi::WaitForSingleObject,
        winbase::INFINITE,
        winnt::{MEM_COMMIT, MEM_RELEASE, MEM_RESERVE, PAGE_EXECUTE_READWRITE},
    },
};
use windows::core::PCSTR;
use windows::Win32::Foundation::HWND as OtherHWND;
use windows::Win32::UI::{Shell::ShellExecuteA, WindowsAndMessaging::SW_HIDE};
use tauri::{Manager, Emitter};

const CREATE_NO_WINDOW: u32 = 0x08000000;
mod launcher;
mod rpc;

#[tauri::command]
fn launch(
    file_path: String,
    email: String,
    password: String,
    redirect_link: String,
    backend: String,
    use_backend_param: bool,
    inject_extra_dlls: bool,
    extra_dll_links: String,
) -> Result<bool, String> {
    println!("=== RUST LAUNCH DEBUG START ===");
    println!("Launch Parameters:");
    println!("- file_path: {}", file_path);
    println!("- email: {}", email);
    println!("- password: [REDACTED]");
    println!("- redirect_link: {}", redirect_link);
    println!("- backend: {}", backend);
    println!("- use_backend_param: {}", use_backend_param);
    println!("- inject_extra_dlls: {}", inject_extra_dlls);
    println!("- extra_dll_links: {}", extra_dll_links);
    
    // Check if this is Discord authentication
    let is_discord_auth = password.starts_with("discord_");
    println!("- is_discord_auth: {}", is_discord_auth);
    
    // Validate required parameters
    if email.is_empty() {
        return Err("Email is required".to_string());
    }
    if password.is_empty() {
        return Err("Password is required".to_string());
    }
    if file_path.is_empty() {
        return Err("File path is required".to_string());
    }
    
    println!("All required parameters validated");
    
    let game_path = PathBuf::from(&file_path);
    let game_game_directory: &Path = game_path
        .parent()
        .expect("Failed to get parent directory")
        .parent()
        .expect("Failed to get FortniteGame directory");

    println!("Game directory: {:?}", game_game_directory);
    
    let game_dll_path = dll_path(game_game_directory);
    println!("Game DLL path: {:?}", game_dll_path);

    if game_dll_path.exists() {
        println!("Removing existing DLL...");
        if let Err(err) = remove_dll(game_game_directory) {
            return Err(format!("Failed to remove game DLL: {}", err));
        }
        println!("Existing DLL removed successfully");
    }

    let dll_url = &format!("{}", redirect_link);
    println!("Downloading DLL from: {}", dll_url);
    
    if let Err(err) = download(dll_url, &game_dll_path) {
        return Err(format!("Failed to download game DLL: {}", err));
    }
    println!("DLL downloaded successfully");

    let cwd = game_game_directory.join("Win64");

    let fn_launcher = cwd.join("FortniteLauncher.exe");
    let fn_shipping = cwd.join("FortniteClient-Win64-Shipping.exe");
    let eac = cwd.join("FortniteClient-Win64-Shipping_BE.exe");

    println!("Checking executables:");
    println!("- Launcher exists: {}", fn_launcher.exists());
    println!("- Shipping exists: {}", fn_shipping.exists());
    println!("- EAC exists: {}", eac.exists());

    if !game_dll_path.exists() {
        return Err("Failed to find Redirect (game DLL)".to_string());
    }

    let b_arg = format!("-backend={}", backend);
    let e_arg = format!("-AUTH_LOGIN={}", email);
    let p_arg = format!("-AUTH_PASSWORD={}", password);

    println!("Authentication args:");
    println!("- backend arg: {}", b_arg);
    println!("- login arg: {}", e_arg);
    println!("- password arg: [REDACTED]");
    
    // Always use epic auth type - Fortnite doesn't support discord auth type
    // Discord users will authenticate with their generated epic credentials
    let auth_type = "epic";
    println!("- auth type: {}", auth_type);

    let mut combined_args = vec![
        "-epicapp=Fortnite",
        "-epicenv=Prod",
        "-epiclocale=en-us",
        "-epicportal",
        "-nobe",
        "-fromfl=eac",
        "-nocodeguards",
        "-nouac",
        "-fltoken=3db3ba5dcbd2e16703f3978d",
        "-caldera=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X2lkIjoiYmU5ZGE1YzJmYmVhNDQwN2IyZjQwZWJhYWQ4NTlhZDQiLCJnZW5lcmF0ZWQiOjE2Mzg3MTcyNzgsImNhbGRlcmFHdWlkIjoiMzgxMGI4NjMtMmE2NS00NDU3LTliNTgtNGRhYjNiNDgyYTg2IiwiYWNQcm92aWRlciI6IkVhc3lBbnRpQ2hlYXQiLCJub3RlcyI6IiIsImZhbGxiYWNrIjpmYWxzZX0.VAWQB67RTxhiWOxx7DBjnzDnXyyEnX7OljJm-j2d88G_WgwQ9wrE6lwMEHZHjBd1ISJdUO1UVUqkfLdU5nofBQs",
        "-skippatchcheck",
        &e_arg,
        &p_arg,
        &format!("-AUTH_TYPE={}", auth_type),
        "-useallavailablecores",
    ]
    .iter()
    .map(|s| s.to_string())
    .collect::<Vec<String>>();

    if use_backend_param {
        combined_args.push(b_arg);
    }

    println!("Final launch arguments: {}", combined_args.join(" "));

    let combined_args_os: Vec<OsString> = combined_args
        .iter()
        .map(|arg| OsString::from(arg))
        .collect();

    let combined_args_str: String = combined_args_os
        .iter()
        .map(|s| s.to_string_lossy())
        .collect::<Vec<_>>()
        .join(" ");

    println!("Executing Fortnite process (suspended)...");
    let mut child = Command::new(&fn_shipping)
        .creation_flags(CREATE_SUSPENDED | CREATE_NO_WINDOW)
        .args(combined_args_os.iter().map(|arg| arg as &OsStr).collect::<Vec<&OsStr>>())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Fortnite: {}", e))?;

    let pid = child.id();
    println!("Fortnite PID: {} (suspended)", pid);

    // Pre-download extra DLLs before launching
    let mut extra_dll_paths: Vec<String> = Vec::new();
    if inject_extra_dlls {
        let links: Vec<&str> = extra_dll_links
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();

        for (i, link) in links.iter().enumerate() {
            let filename = if let Some(last) = link.rsplit('/').next() {
                if last.ends_with(".dll") && !last.is_empty() { last.to_string() } else { format!("extra_{}.dll", i + 1) }
            } else { format!("extra_{}.dll", i + 1) };

            let dest_path = cwd.join(&filename);
            println!("Downloading extra DLL {} from: {}", i + 1, link);
            if dest_path.exists() { let _ = fs::remove_file(&dest_path); }
            if let Err(err) = download(link, &dest_path) {
                return Err(format!("Failed to download extra DLL from {}: {}", link, err));
            }
            extra_dll_paths.push(dest_path.to_str().unwrap().to_string());
        }
    }

    // Download and inject extra DLLs while process is suspended — REMOVED
    // We resume first, wait for game to init, then inject

    // Resume the process immediately
    println!("Resuming Fortnite process...");
    unsafe {
        let h_process = OpenProcess(
            PROCESS_CREATE_THREAD | PROCESS_QUERY_INFORMATION | PROCESS_VM_OPERATION | PROCESS_VM_WRITE | PROCESS_VM_READ,
            0,
            pid,
        );
        if !h_process.is_null() {
            let te: &mut THREADENTRY32 = &mut std::mem::zeroed();
            (*te).dwSize = std::mem::size_of::<THREADENTRY32>() as u32;
            let snapshot: HANDLE = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);
            if Thread32First(snapshot, te) == 1 {
                loop {
                    if pid == (*te).th32OwnerProcessID {
                        let thread = OpenThread(THREAD_SUSPEND_RESUME, FALSE, (*te).th32ThreadID);
                        if !thread.is_null() { ResumeThread(thread); CloseHandle(thread); }
                    }
                    if Thread32Next(snapshot, te) == 0 { break; }
                }
            }
            CloseHandle(snapshot);
            CloseHandle(h_process);
        }
    }

    println!("Waiting 5 seconds before starting EAC/Launcher...");
    std::thread::sleep(std::time::Duration::from_secs(5));

    println!("Starting EAC process...");
    let _eac_proc = Command::new(&eac)
        .creation_flags(CREATE_NO_WINDOW | CREATE_SUSPENDED)
        .args(combined_args_os.iter().map(|arg| arg as &OsStr).collect::<Vec<&OsStr>>())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start EAC: {}", e));

    println!("Starting Launcher process...");
    let _launcher_proc = Command::new(&fn_launcher)
        .creation_flags(CREATE_NO_WINDOW | CREATE_SUSPENDED)
        .args(combined_args_os.iter().map(|arg| arg as &OsStr).collect::<Vec<&OsStr>>())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Launcher: {}", e));

    // Wait for game to fully initialize before injecting
    if inject_extra_dlls && !extra_dll_paths.is_empty() {
        println!("Waiting 50 seconds for game to initialize before injecting...");
        std::thread::sleep(std::time::Duration::from_secs(50));
        for dest_str in &extra_dll_paths {
            println!("Injecting: {}", dest_str);
            if let Err(err) = inject_dll(pid, dest_str) {
                return Err(format!("Failed to inject {}: {}", dest_str, err));
            }
            println!("Injected: {}", dest_str);
        }
    }
    
    println!("=== RUST LAUNCH DEBUG END ===");
    println!("Fortnite launch completed successfully!");

    Ok(true)
}

// New advanced launch function from skids version
pub fn kill_epic() {
    let cmd = std::process::Command::new("cmd")
        .creation_flags(CREATE_NO_WINDOW)
        .args(&["/C", "taskkill /F /IM", "EpicGamesLauncher.exe"])
        .spawn();

    if cmd.is_err() {
        return;
    }

    std::thread::sleep(std::time::Duration::from_millis(10));
}

pub async fn download_async(url: &str, filename: &str, path: &str, window: &tauri::Window) -> Result<(), String> {
    println!("Downloading {} from: {}", filename, url);
    
    let full_url = if url.ends_with('/') || url.is_empty() {
        format!("{}{}", url, filename)
    } else {
        url.to_string()
    };

    let response = reqwest::get(&full_url)
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed for {}: {}", filename, response.status()));
    }

    let _ = window.emit("update-status", format!("Downloading: {}", filename));

    let content = response.bytes().await.map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| format!("File Error: {}", e))?;
    
    Ok(())
}

pub async fn download_paks(game_root: &str, urls: String, app: &tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if urls.trim().is_empty() { return Ok(()); }

    let window = app.get_window("main").ok_or("Main window not found")?;
    let mut paks_path = std::path::PathBuf::from(game_root);
    paks_path.push("FortniteGame\\Content\\Paks");

    if !paks_path.exists() {
        std::fs::create_dir_all(&paks_path).map_err(|e| e.to_string())?;
    }

    let url_list: Vec<&str> = urls.split(',').filter(|s| !s.trim().is_empty()).collect();
    
    let _ = window.emit("download-start", true);

    for (i, url) in url_list.iter().enumerate() {
        let filename = url.split('/').last().unwrap_or("unknown.pak");
        let target_path = paks_path.join(filename);
        let progress = ((i + 1) as f32 / url_list.len() as f32 * 100.0) as u32;

        if target_path.exists() {
            let _ = window.emit("download-progress", progress);
            continue; 
        }

        let _ = window.emit("update-status", format!("Installing: {}", filename));
        let _ = window.emit("download-progress", progress);
        
        let target_str = target_path.to_str().unwrap();

        match download_async(url, filename, target_str, &window).await {
            Ok(_) => {
            }
            Err(e) => {
                let _ = window.emit("download-warning", format!("Failed: {} (Skipping in 3s)", filename));
                println!("Download failed for {}: {}", filename, e);

                tokio::time::sleep(Duration::from_secs(3)).await;

                let _ = window.emit("update-status", "Resuming...");
            }
        }
    }
    let _ = window.emit("download-complete", true);
    Ok(())
}

pub fn is_process_suspended(pid: u32) -> bool {
    unsafe {
        let mut is_suspended = true;

        let te: &mut THREADENTRY32 = &mut std::mem::zeroed();
        (*te).dwSize = std::mem::size_of::<THREADENTRY32>() as u32;

        let snapshot: HANDLE = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);

        if Thread32First(snapshot, te) == 1 {
            loop {
                if pid == (*te).th32OwnerProcessID {
                    let tid = (*te).th32ThreadID;

                    let thread: HANDLE = OpenThread(THREAD_SUSPEND_RESUME, FALSE, tid);
                    let suspend_count = SuspendThread(thread) as i32;

                    if suspend_count == -1i32 {
                        is_suspended = false;
                    } else {
                        is_suspended &= suspend_count > 0;
                    }

                    CloseHandle(thread);
                }

                if Thread32Next(snapshot, te) == 0 {
                    break;
                }
            }
        }

        CloseHandle(snapshot);

        is_suspended
    }
}

pub async fn launch_real_launcher(root: &str) -> Result<bool, String> {
    println!("Launching real launcher at path: {}", root);

    let base = std::path::PathBuf::from(root);
    let mut resource_path = base.clone();
    resource_path.push("FortniteGame\\Binaries\\Win64\\FortniteLauncher.exe");

    println!("Launcher path: {:?}", resource_path);

    let mut cwd = std::path::PathBuf::from(root);
    cwd.push("FortniteGame\\Binaries\\Win64");

    println!("Current directory for launcher: {:?}", cwd);

    kill_epic();
    println!("Killed Epic process.");

    let cmd = std::process::Command::new(resource_path.clone())
        .creation_flags(CREATE_NO_WINDOW | 0x00000004)
        .current_dir(cwd)
        .spawn();

    if cmd.is_err() {
        println!("Failed to launch '{}'", resource_path.to_str().unwrap());
        return Err(format!(
            "Failed to launch '{}'",
            resource_path.to_str().unwrap()
        ));
    }

    let pid = cmd.unwrap().id();
    println!("Launched process with PID: {}", pid);

    while !is_process_suspended(pid.clone()) {
        let (_, _) = suspend(pid.clone());
        println!("Suspended process with PID: {}", pid);
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    kill_epic();
    Ok(true)
}

#[tauri::command]
fn exit() -> Result<(), String> {
    let fortnite_procs = [
        "EpicgamesLauncher.exe",
        "FortniteLauncher.exe",
        "FortniteClient-Win64-Shipping.exe",
        "EasyAntiCheat_EOS.exe",
        "EpicWebHelper.exe",
        "FortniteClient-Win64-Shipping_BE.exe",
        "FortniteClient-Win64-Shipping_EAC.exe",
    ];

    let batch_path = std::env::temp_dir().join("close.bat");

    let mut file = std::fs::File::create(&batch_path)
        .map_err(|e| format!("Failed to create batch file: {}", e))?;

    let mut write_line =
        |line: &str| writeln!(file, "{}", line).map_err(|e| format!("Write error: {}", e));

    write_line("@echo off")?;
    for proc in &fortnite_procs {
        write_line(&format!("taskkill /F /IM \"{}\" >nul 2>&1", proc))?;
    }
    write_line("del \"%~f0\"")?;
    drop(file);

    let path_str = batch_path
        .to_str()
        .ok_or("Failed to convert batch path to string")?;
    let path_cstr = CString::new(path_str).map_err(|e| format!("CString error: {}", e))?;

    let hwnd = OtherHWND(std::ptr::null_mut());

    let result = unsafe {
        ShellExecuteA(
            hwnd,
            PCSTR(b"runas\0".as_ptr()),
            PCSTR(path_cstr.as_ptr() as *const u8),
            PCSTR::null(),
            PCSTR::null(),
            SW_HIDE,
        )
    };

    if result.0 as isize <= 32 {
        return Err("Failed to launch batch file with elevated permissions".into());
    }

    Ok(())
}

fn dll_path(game_path: &Path) -> PathBuf {
    game_path.parent().unwrap().parent().unwrap().join(
        "Engine\\Binaries\\ThirdParty\\NVIDIA\\NVaftermath\\Win64\\GFSDK_Aftermath_Lib.x64.dll",
    )
}

fn remove_dll(game_path: &Path) -> Result<(), String> {
    let game_dll_path = dll_path(game_path);

    loop {
        match std::fs::remove_file(&game_dll_path) {
            Ok(_) => break,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => break,
            Err(_) => std::thread::sleep(std::time::Duration::from_millis(100)),
        }
    }
    Ok(())
}

#[tauri::command]
fn download(url: &str, dest: &Path) -> Result<(), String> {
    let response = reqwest::blocking::get(url).map_err(|e| e.to_string())?;
    let mut file = fs::File::create(dest).map_err(|e| e.to_string())?;
    let content = response.bytes().map_err(|e| e.to_string())?;
    file.write_all(&content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_file(path: &str) -> Result<(), String> {
    let p = std::path::Path::new(path);
    if p.exists() {
        fs::remove_file(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn suspend(pid: u32) -> (u32, bool) {
    unsafe {
        let mut has_err = false;
        let mut count: u32 = 0;

        let te: &mut THREADENTRY32 = &mut std::mem::zeroed();
        (*te).dwSize = std::mem::size_of::<THREADENTRY32>() as u32;

        let snapshot: HANDLE = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);

        if Thread32First(snapshot, te) == 1 {
            loop {
                if pid == (*te).th32OwnerProcessID {
                    let tid = (*te).th32ThreadID;

                    let thread: HANDLE = OpenThread(THREAD_SUSPEND_RESUME, FALSE, tid);
                    has_err |= SuspendThread(thread) as i32 == -1i32;

                    CloseHandle(thread);
                    count += 1;
                }

                if Thread32Next(snapshot, te) == 0 {
                    break;
                }
            }
        }

        CloseHandle(snapshot);

        (count, has_err)
    }
}

#[tauri::command]
fn inject_dll(pid: u32, dll_path: &str) -> Result<(), String> {
    unsafe {
        let h_process = OpenProcess(
            PROCESS_CREATE_THREAD
                | PROCESS_QUERY_INFORMATION
                | PROCESS_VM_OPERATION
                | PROCESS_VM_WRITE
                | PROCESS_VM_READ,
            0,
            pid,
        );
        if h_process.is_null() {
            return Err(format!(
                "Failed to open process. WinError: {}",
                std::io::Error::last_os_error()
            ));
        }

        let dll_path_c = CString::new(dll_path).map_err(|_| "Failed to create CString")?;

        let dll_path_ptr = VirtualAllocEx(
            h_process,
            std::ptr::null_mut(),
            dll_path_c.as_bytes_with_nul().len(),
            MEM_COMMIT | MEM_RESERVE,
            PAGE_EXECUTE_READWRITE,
        );
        if dll_path_ptr.is_null() {
            return Err("Failed to allocate memory".to_string());
        }

        if winapi::um::memoryapi::WriteProcessMemory(
            h_process,
            dll_path_ptr,
            dll_path_c.as_ptr() as LPVOID,
            dll_path_c.as_bytes_with_nul().len(),
            std::ptr::null_mut(),
        ) == 0
        {
            return Err("Failed to write to process memory".to_string());
        }

        let kernel32_c = CString::new("kernel32.dll").unwrap();
        let h_kernel32 = GetModuleHandleA(kernel32_c.as_ptr());
        if h_kernel32.is_null() {
            return Err("Failed to get kernel32.dll handle".to_string());
        }

        let load_library_c = CString::new("LoadLibraryA").unwrap();
        let h_load_library = GetProcAddress(h_kernel32, load_library_c.as_ptr());
        if h_load_library.is_null() {
            return Err("Failed to get address of LoadLibraryA".to_string());
        }

        let thread_handle = CreateRemoteThread(
            h_process,
            std::ptr::null_mut(),
            0,
            Some(std::mem::transmute::<
                _,
                unsafe extern "system" fn(LPVOID) -> DWORD,
            >(h_load_library)),
            dll_path_ptr,
            0,
            std::ptr::null_mut(),
        );
        if thread_handle.is_null() {
            return Err("Failed to create remote thread".to_string());
        }

        WaitForSingleObject(thread_handle, INFINITE);
        VirtualFreeEx(h_process, dll_path_ptr, 0, MEM_RELEASE);
        winapi::um::handleapi::CloseHandle(h_process);
    }

    Ok(())
}

#[tauri::command]
async fn exists(path: &str) -> Result<bool, String> {
    let exists = PathBuf::from(path).exists();
    Ok(exists)
}

#[tauri::command]
fn check_build(path: &str) -> Result<Vec<String>, String> {
    let mut file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut data = Vec::new();
    file.read_to_end(&mut data)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let marker: Vec<u8> = "++Fortnite+"
        .encode_utf16()
        .flat_map(|x| x.to_le_bytes())
        .collect();

    let mut results = Vec::new();

    for i in 0..=data.len().saturating_sub(marker.len()) {
        if data[i..i + marker.len()] == marker[..] {
            let lookahead = &data[i + marker.len()..data.len().min(i + marker.len() + 64)];
            if let Some(end_offset) = check_null(lookahead) {
                let bytes = &data[i..i + marker.len() + end_offset];
                let utf16_words: Vec<u16> = bytes
                    .chunks_exact(2)
                    .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
                    .collect();

                let decoded = String::from_utf16_lossy(&utf16_words);
                let clean = decoded.trim_end_matches('\0').to_string();
                results.push(clean);
            }
        }
    }

    Ok(results)
}

fn check_null(buf: &[u8]) -> Option<usize> {
    buf.windows(2)
        .step_by(2)
        .position(|pair| pair == [0, 0])
        .map(|pos| pos * 2)
}

#[tauri::command]
async fn discord_auth(
    discord_id: String,
    username: String,
    avatar_hash: String,
    email: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    // Store Discord auth data in app state
    app_handle.manage(DiscordAuthData {
        discord_id,
        username,
        avatar_hash,
        email,
    });
    
    // Show the main window
    let window = app_handle.get_webview_window("main").ok_or("Failed to get main window")?;
    window.show().map_err(|e| format!("Failed to show window: {}", e))?;
    window.set_focus().map_err(|e| format!("Failed to focus window: {}", e))?;
    
    Ok(())
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct DiscordAuthData {
    discord_id: String,
    username: String,
    avatar_hash: String,
    email: String,
}

#[tauri::command]
async fn http_patch(url: String, body: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let res = client
        .patch(&url)
        .header("Content-Type", "application/json")
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            check_build,
            exists,
            launch,
            launcher::get_public_key,
            launcher::sign_nonce,
            launcher::get_or_create_license_id,
            exit,
            download,
            delete_file,
            discord_auth,
            http_patch,
            rpc::start_rpc,
            rpc::update_rpc,
            rpc::stop_rpc,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
