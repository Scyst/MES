use serde::Serialize;
use std::sync::atomic::{AtomicIsize, Ordering};
use std::thread;
use std::time::Duration;
use sysinfo::{Networks, System};
use tauri::Emitter;

use winapi::shared::minwindef::{BOOL, LPARAM, WPARAM, LRESULT};
use winapi::shared::windef::HWND;
use winapi::um::winuser::{
    EnumWindows, FindWindowExW, FindWindowW, GetParent, GetSystemMetrics,
    GetWindowLongW, SendMessageTimeoutW, SetParent,
    SetWindowLongW, SetWindowPos,
    GWL_EXSTYLE, SM_CXSCREEN, SM_CYSCREEN, SMTO_NORMAL,
    SWP_FRAMECHANGED,
    WS_EX_LAYERED, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
    SetLayeredWindowAttributes, LWA_ALPHA,
    SWP_NOZORDER,
    SystemParametersInfoW, SPI_SETDESKWALLPAPER, SPIF_UPDATEINIFILE,
};

// Stores WorkerW handle so we can unparent later
static WORKER_W: AtomicIsize = AtomicIsize::new(0);

/// Encodes a &str to null-terminated UTF-16 Vec
fn wide(s: &str) -> Vec<u16> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
}

/// EnumWindows callback: finds the WorkerW layer that lives behind desktop icons
unsafe extern "system" fn find_worker_w(hwnd: HWND, _param: LPARAM) -> BOOL {
    let shell_class = wide("SHELLDLL_DefView");
    let worker_class = wide("WorkerW");
    let shell_def = FindWindowExW(hwnd, std::ptr::null_mut(), shell_class.as_ptr(), std::ptr::null());
    if !shell_def.is_null() {
        let ww = FindWindowExW(std::ptr::null_mut(), hwnd, worker_class.as_ptr(), std::ptr::null());
        if !ww.is_null() {
            WORKER_W.store(ww as isize, Ordering::SeqCst);
        }
    }
    1 // TRUE — continue enumeration
}

#[derive(Clone, serde::Serialize)]
struct SysPayload {
    cpu_percent: f32,
    cpu_cores: Vec<f32>,
    ram_used_mb: f64,
    ram_total_mb: f64,
    net_down_kbps: f64,
    net_up_kbps: f64,
    disk_read_kbps: f64,
    disk_write_kbps: f64,
    cpu_name: String,
    cpu_freq: u64,
    disk_total_gb: f64,
    disk_used_gb: f64,
    hostname: String,
    os: String,
    uptime: u64,
    total_processes: usize,
    processes: Vec<ProcInfo>,
    gpus: Vec<GpuInfo>,
}

#[derive(Serialize, Clone)]
struct GpuInfo {
    name: String,
    util: f64,
    mem_used: f64,
    mem_total: f64,
    temp: f64,
    is_nvidia: bool,
}

#[derive(Serialize, Clone)]
struct ProcInfo {
    pid: u32,
    name: String,
    cpu: f32,
    ram_mb: f64,
    disk_total_mb: f64,
    threads: usize,
}

fn get_gpus_names() -> Vec<String> {
    let mut gpus = Vec::new();
    if let Ok(output) = std::process::Command::new("wmic")
        .args(["path", "win32_VideoController", "get", "name"])
        .output()
    {
        let out = String::from_utf8_lossy(&output.stdout);
        for line in out.lines() {
            let l = line.trim();
            if !l.is_empty() && l != "Name" {
                gpus.push(l.to_string());
            }
        }
    }
    if gpus.is_empty() {
        gpus.push("Unknown GPU".to_string());
    }
    gpus
}

fn get_nvidia_info() -> Option<(f64, f64, f64, f64)> {
    use std::os::windows::process::CommandExt;
    if let Ok(output) = std::process::Command::new("nvidia-smi")
        .args([
            "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu",
            "--format=csv,noheader,nounits",
        ])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
    {
        let out = String::from_utf8_lossy(&output.stdout);
        let parts: Vec<&str> = out.trim().split(',').collect();
        if parts.len() >= 4 {
            let u = parts[0].trim().parse::<f64>().unwrap_or(0.0);
            let mu = parts[1].trim().parse::<f64>().unwrap_or(0.0);
            let mt = parts[2].trim().parse::<f64>().unwrap_or(0.0);
            let t = parts[3].trim().parse::<f64>().unwrap_or(0.0);
            return Some((u, mu, mt, t));
        }
    }
    None
}

#[tauri::command]
fn exit_app() {
    std::process::exit(0);
}

/// Restores the window to a normal bordered window and unparents it from WorkerW
#[tauri::command]
fn set_window_mode(window: tauri::Window) {
    let _ = window.set_always_on_top(false);
    let _ = window.set_decorations(true);
    let _ = window.set_skip_taskbar(false);

    if let Ok(hwnd) = window.hwnd() {
        unsafe {
            let hwnd_ptr = hwnd.0 as HWND;
            let parent = GetParent(hwnd_ptr);
            let target = if parent.is_null() { hwnd_ptr } else { parent };

            // Unparent from WorkerW if previously attached
            SetParent(target, std::ptr::null_mut());

            // Remove tool-window / no-activate styles
            let mut ex = GetWindowLongW(target, GWL_EXSTYLE);
            ex &= !(WS_EX_TOOLWINDOW as i32);
            ex &= !(WS_EX_NOACTIVATE as i32);
            ex &= !(WS_EX_LAYERED as i32);
            SetWindowLongW(target, GWL_EXSTYLE, ex);

            // Restore full opacity
            SetLayeredWindowAttributes(target, 0, 255, LWA_ALPHA);

            // Force Windows to redraw the desktop wallpaper and remove the empty WorkerW layer
            SystemParametersInfoW(SPI_SETDESKWALLPAPER, 0, std::ptr::null_mut(), SPIF_UPDATEINIFILE);
        }
    }

    // Restore window to maximized state
    let _ = window.set_fullscreen(false);
    let _ = window.maximize();
}

/// Resizes window to a compact top-right floating bar (Always on Top)
#[tauri::command]
fn set_mini_mode(window: tauri::Window) {
    let _ = window.set_always_on_top(true);
    let _ = window.set_decorations(false);
    let _ = window.set_skip_taskbar(true);

    if let Ok(hwnd) = window.hwnd() {
        unsafe {
            let hwnd_ptr = hwnd.0 as HWND;
            let parent = GetParent(hwnd_ptr);
            let target = if parent.is_null() { hwnd_ptr } else { parent };

            // Unparent from WorkerW in case we were in widget mode
            SetParent(target, std::ptr::null_mut());

            // Remove toolwindow style so it's truly floating
            // DO NOT add WS_EX_NOACTIVATE here, otherwise Tauri drag (HTCAPTION) will not work!
            let mut ex = GetWindowLongW(target, GWL_EXSTYLE);
            ex &= !(WS_EX_TOOLWINDOW as i32);
            ex &= !(WS_EX_NOACTIVATE as i32);
            SetWindowLongW(target, GWL_EXSTYLE, ex);

            // Force Windows to redraw the desktop wallpaper and remove the empty WorkerW layer (if coming from Widget mode)
            SystemParametersInfoW(SPI_SETDESKWALLPAPER, 0, std::ptr::null_mut(), SPIF_UPDATEINIFILE);

            // Position: top-right corner of primary screen
            let screen_w = GetSystemMetrics(SM_CXSCREEN);
            let bar_w: i32 = 720;
            let bar_h: i32 = 52;
            let x = screen_w - bar_w - 16;
            let y = 16;
            SetWindowPos(
                target,
                usize::MAX as HWND, // HWND_TOPMOST = -1 (all bits set)
                x, y, bar_w, bar_h,
                SWP_FRAMECHANGED,
            );
        }
    }
}

/// Uses the "Progman trick" to embed the window behind desktop icons (like Wallpaper Engine)
#[tauri::command]
fn set_widget_mode(window: tauri::Window) {
    let _ = window.set_always_on_top(false);
    let _ = window.set_decorations(false);
    let _ = window.set_skip_taskbar(true);

    if let Ok(hwnd) = window.hwnd() {
        unsafe {
            let hwnd_ptr = hwnd.0 as HWND;
            let parent = GetParent(hwnd_ptr);
            let target = if parent.is_null() { hwnd_ptr } else { parent };

            // 1. Find Progman and tell it to spawn the WorkerW layer
            let progman_class = wide("Progman");
            let progman = FindWindowW(progman_class.as_ptr(), std::ptr::null());
            if !progman.is_null() {
                let mut result: usize = 0;
                SendMessageTimeoutW(
                    progman, 0x052C, 0, 0, SMTO_NORMAL, 1000,
                    &mut result as *mut usize as *mut _,
                );
            }

            // 2. Find the WorkerW that has SHELLDLL_DefView as a child
            WORKER_W.store(0, Ordering::SeqCst);
            EnumWindows(Some(find_worker_w), 0);
            let ww = WORKER_W.load(Ordering::SeqCst) as HWND;

            if !ww.is_null() {
                // 3. Parent our window into WorkerW → it now lives behind desktop icons
                SetParent(target, ww);

                // 4. Stretch to full screen
                let screen_w = GetSystemMetrics(SM_CXSCREEN);
                let screen_h = GetSystemMetrics(SM_CYSCREEN);
                SetWindowPos(
                    target,
                    std::ptr::null_mut(),
                    0, 0, screen_w, screen_h,
                    SWP_NOZORDER | SWP_FRAMECHANGED,
                );
            }

            // 5. Remove no-activate/toolwindow styles (desktop layer doesn't need them)
            let mut ex = GetWindowLongW(target, GWL_EXSTYLE);
            ex &= !(WS_EX_TOOLWINDOW as i32);
            ex |= WS_EX_LAYERED as i32;
            SetWindowLongW(target, GWL_EXSTYLE, ex);
        }
    }
}

/// Sets window alpha opacity (0 = invisible, 255 = opaque)
#[tauri::command]
fn set_opacity(window: tauri::Window, alpha: u8) {
    if let Ok(hwnd) = window.hwnd() {
        unsafe {
            let hwnd_ptr = hwnd.0 as HWND;
            let parent = GetParent(hwnd_ptr);
            let target = if parent.is_null() { hwnd_ptr } else { parent };

            // Ensure WS_EX_LAYERED is set
            let mut ex = GetWindowLongW(target, GWL_EXSTYLE);
            ex |= WS_EX_LAYERED as i32;
            SetWindowLongW(target, GWL_EXSTYLE, ex);

            SetLayeredWindowAttributes(target, 0, alpha, LWA_ALPHA);
        }
    }
}

#[tauri::command]
fn check_backend_status() -> bool {
    let mut sys = sysinfo::System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let mut is_dashboard_running = false;
    let mut is_logger_running = false;
    let mut is_backup_running = false;
    for (_pid, process) in sys.processes() {
        let name = process.name().to_string_lossy().to_lowercase();
        let cmd_vec: Vec<String> = process.cmd().iter().map(|s| s.to_string_lossy().into_owned()).collect();
        let cmd = cmd_vec.join(" ").to_lowercase();
        let full_info = format!("{} {}", name, cmd);

        if full_info.contains("performance_dashboard.cjs") {
            is_dashboard_running = true;
        }
        if full_info.contains("performance_logger.cjs") {
            is_logger_running = true;
        }
        if full_info.contains("backup_server.cjs") {
            is_backup_running = true;
        }
    }
    is_dashboard_running && is_logger_running && is_backup_running
}

#[tauri::command]
fn start_backend() -> bool {
    let app_data = std::env::var("APPDATA").unwrap_or_default();
    let vbs_path = format!("{}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\mes_performance_tracker.vbs", app_data);
    let target_vbs = if std::path::Path::new(&vbs_path).exists() {
        vbs_path
    } else {
        r"E:\MES\MES\MES\SystemMonitorBackend\start_dashboard.vbs".to_string()
    };
    std::process::Command::new("wscript")
        .arg(target_vbs)
        .spawn()
        .is_ok()
}

#[tauri::command]
fn force_backup() -> bool {
    // Create the trigger_backup.flag file in the backend directory
    let flag_path = r"E:\MES\MES\MES\SystemMonitorBackend\trigger_backup.flag";
    match std::fs::write(flag_path, "") {
        Ok(_) => true,
        Err(e) => {
            eprintln!("Failed to write trigger flag: {}", e);
            false
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            exit_app, set_window_mode, set_mini_mode, set_widget_mode, set_opacity,
            check_backend_status, start_backend, force_backup
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_handle = app.handle().clone();
            // ─── System Tray (raw Shell_NotifyIconW — no windres needed) ─────
            {
                let tray_app = app.handle().clone();
                thread::spawn(move || {
                    use std::mem;
                    use winapi::um::libloaderapi::GetModuleHandleW;
                    use winapi::um::shellapi::{
                        Shell_NotifyIconW, NOTIFYICONDATAW,
                        NIF_ICON, NIF_MESSAGE, NIF_TIP, NIM_ADD, NIM_DELETE,
                    };
                    use winapi::um::winuser::*;

                    const WM_TRAY: u32 = WM_USER + 1;
                    const WM_SHOW_MENU: u32 = WM_USER + 2;
                    const CMD_WINDOW: usize = 1001;
                    const CMD_MINI:   usize = 1002;
                    const CMD_WIDGET: usize = 1003;
                    const CMD_EXIT:   usize = 1004;

                    unsafe extern "system" fn tray_wnd_proc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
                        if msg == WM_TRAY {
                            let evt = (lparam as usize & 0xFFFF) as u32;
                            if evt == WM_LBUTTONUP || evt == WM_RBUTTONUP || evt == WM_LBUTTONDOWN || evt == WM_RBUTTONDOWN {
                                PostMessageW(hwnd, WM_SHOW_MENU, 0, 0);
                            }
                            return 0;
                        }
                        DefWindowProcW(hwnd, msg, wparam, lparam)
                    }

                    unsafe {
                        let class_name: Vec<u16> = "SysMonTrayClass\0".encode_utf16().collect();
                        let mut wc: WNDCLASSEXW = mem::zeroed();
                        wc.cbSize = mem::size_of::<WNDCLASSEXW>() as u32;
                        wc.lpfnWndProc = Some(tray_wnd_proc);
                        wc.hInstance = GetModuleHandleW(std::ptr::null());
                        wc.lpszClassName = class_name.as_ptr();
                        RegisterClassExW(&wc);

                        // Create a real (but hidden) top-level window.
                        // HWND_MESSAGE cannot be made foreground, which breaks TrackPopupMenu.
                        let hwnd = CreateWindowExW(
                            0, class_name.as_ptr(), std::ptr::null(),
                            WS_POPUP, 0, 0, 0, 0,
                            std::ptr::null_mut(), std::ptr::null_mut(),
                            GetModuleHandleW(std::ptr::null()), std::ptr::null_mut(),
                        );
                        if hwnd.is_null() { return; }
                        ShowWindow(hwnd, SW_HIDE); // keep invisible

                        // Register tray icon
                        let mut nid: NOTIFYICONDATAW = mem::zeroed();
                        nid.cbSize = mem::size_of::<NOTIFYICONDATAW>() as u32;
                        nid.hWnd = hwnd;
                        nid.uID = 1;
                        nid.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP;
                        nid.uCallbackMessage = WM_TRAY;
                        nid.hIcon = LoadIconW(std::ptr::null_mut(), IDI_APPLICATION);
                        let tip: Vec<u16> = "SystemMonitorPro\0".encode_utf16().collect();
                        let tl = tip.len().min(nid.szTip.len());
                        nid.szTip[..tl].copy_from_slice(&tip[..tl]);
                        Shell_NotifyIconW(NIM_ADD, &mut nid);

                        // Message pump
                        let mut msg: MSG = mem::zeroed();
                        loop {
                            if GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) <= 0 { break; }

                            if msg.message == WM_SHOW_MENU {
                                // Build popup menu
                                let hmenu = CreatePopupMenu();
                                macro_rules! add_item {
                                    ($id:expr, $label:expr) => {{
                                        let w: Vec<u16> = concat!($label, "\0").encode_utf16().collect();
                                        AppendMenuW(hmenu, MF_STRING, $id, w.as_ptr());
                                    }};
                                }
                                add_item!(CMD_WINDOW, "Window Mode");
                                add_item!(CMD_MINI,   "Mini Bar (Always-on-Top)");
                                add_item!(CMD_WIDGET, "Desktop Widget");
                                AppendMenuW(hmenu, MF_SEPARATOR, 0, std::ptr::null());
                                add_item!(CMD_EXIT, "Exit");

                                let mut pt: winapi::shared::windef::POINT = mem::zeroed();
                                GetCursorPos(&mut pt);
                                SetForegroundWindow(hwnd);

                                let cmd = TrackPopupMenu(
                                    hmenu,
                                    TPM_RETURNCMD | TPM_RIGHTBUTTON | TPM_BOTTOMALIGN,
                                    pt.x, pt.y, 0, hwnd, std::ptr::null(),
                                ) as usize;
                                
                                PostMessageW(hwnd, WM_NULL, 0, 0); // Force menu to close if clicked away
                                DestroyMenu(hmenu);

                                match cmd {
                                    CMD_EXIT => std::process::exit(0),
                                    CMD_WINDOW => { let _ = tray_app.emit("tray_cmd", "window_mode"); }
                                    CMD_MINI   => { let _ = tray_app.emit("tray_cmd", "mini_mode"); }
                                    CMD_WIDGET => { let _ = tray_app.emit("tray_cmd", "widget_mode"); }
                                    _ => {}
                                }
                            }

                            TranslateMessage(&msg);
                            DispatchMessageW(&msg);
                        }

                        Shell_NotifyIconW(NIM_DELETE, &mut nid);
                    }
                });
            }
            // ─────────────────────────────────────────────────────────────────


            // Spawn background thread to poll system
            thread::spawn(move || {
                let mut sys = System::new_all();
                let mut networks = Networks::new_with_refreshed_list();
                let mut disks = sysinfo::Disks::new_with_refreshed_list();

                let mut prev_total_disk_read = 0u64;
                let mut prev_total_disk_write = 0u64;

                let gpu_names = get_gpus_names();

                // Sleep once so CPU measurement is accurate
                thread::sleep(Duration::from_millis(500));

                loop {
                    sys.refresh_cpu_all();
                    sys.refresh_memory();
                    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
                    networks.refresh(true);
                    disks.refresh(true);

                    let global_cpu = sys.global_cpu_usage();
                    let cpu_cores: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();

                    let cpu_name = sys
                        .cpus()
                        .first()
                        .map(|c| c.brand().to_string())
                        .unwrap_or_else(|| "Unknown CPU".to_string());
                    let cpu_freq = sys.cpus().first().map(|c| c.frequency()).unwrap_or(0);

                    let ram_u = sys.used_memory() as f64 / 1_048_576.0;
                    let ram_t = sys.total_memory() as f64 / 1_048_576.0;

                    let mut net_down_bytes = 0u64;
                    let mut net_up_bytes = 0u64;
                    for (_name, data) in &networks {
                        net_down_bytes += data.received();
                        net_up_bytes += data.transmitted();
                    }
                    let net_down_kbps = (net_down_bytes as f64) / 1024.0;
                    let net_up_kbps = (net_up_bytes as f64) / 1024.0;

                    let mut disk_total_bytes = 0u64;
                    let mut disk_used_bytes = 0u64;
                    for disk in &disks {
                        disk_total_bytes += disk.total_space();
                        let used = disk.total_space().saturating_sub(disk.available_space());
                        disk_used_bytes += used;
                    }
                    let disk_total_gb = (disk_total_bytes as f64) / 1_073_741_824.0;
                    let disk_used_gb = (disk_used_bytes as f64) / 1_073_741_824.0;

                    let mut proc_vec = Vec::new();
                    let mut current_total_disk_read = 0u64;
                    let mut current_total_disk_write = 0u64;

                    for (pid, process) in sys.processes() {
                        let c = process.cpu_usage();
                        let m = process.memory() as f64 / 1_048_576.0;
                        let du = process.disk_usage();

                        current_total_disk_read += du.read_bytes;
                        current_total_disk_write += du.written_bytes;

                        if c > 0.0 || m > 10.0 {
                            proc_vec.push(ProcInfo {
                                pid: pid.as_u32(),
                                name: process.name().to_string_lossy().to_string(),
                                cpu: c,
                                ram_mb: m,
                                disk_total_mb: ((du.read_bytes + du.written_bytes) as f64)
                                    / 1_048_576.0,
                                threads: process.tasks().map(|t| t.len()).unwrap_or(0),
                            });
                        }
                    }

                    let disk_read_kbps = if prev_total_disk_read > 0
                        && current_total_disk_read >= prev_total_disk_read
                    {
                        ((current_total_disk_read - prev_total_disk_read) as f64) / 1024.0
                    } else {
                        0.0
                    };

                    let disk_write_kbps = if prev_total_disk_write > 0
                        && current_total_disk_write >= prev_total_disk_write
                    {
                        ((current_total_disk_write - prev_total_disk_write) as f64) / 1024.0
                    } else {
                        0.0
                    };

                    prev_total_disk_read = current_total_disk_read;
                    prev_total_disk_write = current_total_disk_write;

                    // Sort by CPU
                    proc_vec.sort_by(|a, b| {
                        b.cpu
                            .partial_cmp(&a.cpu)
                            .unwrap_or(std::cmp::Ordering::Equal)
                    });
                    proc_vec.truncate(15); // top 15

                    let hostname =
                        sysinfo::System::host_name().unwrap_or_else(|| "UNKNOWN_HOST".to_string());
                    let os = sysinfo::System::long_os_version()
                        .unwrap_or_else(|| "Unknown OS".to_string());
                    let uptime = sysinfo::System::uptime();
                    let total_processes = sys.processes().len();

                    let mut gpus = Vec::new();
                    for name in &gpu_names {
                        let is_nvidia = name.to_lowercase().contains("nvidia");
                        if is_nvidia {
                            if let Some((u, mu, mt, t)) = get_nvidia_info() {
                                gpus.push(GpuInfo {
                                    name: name.clone(),
                                    util: u,
                                    mem_used: mu,
                                    mem_total: mt,
                                    temp: t,
                                    is_nvidia: true,
                                });
                                continue;
                            }
                        }
                        // Default / non-NVIDIA fallback
                        gpus.push(GpuInfo {
                            name: name.clone(),
                            util: 0.0,
                            mem_used: 0.0,
                            mem_total: 100.0,
                            temp: 0.0,
                            is_nvidia: false,
                        });
                    }

                    let payload = SysPayload {
                        cpu_percent: global_cpu,
                        cpu_cores,
                        ram_used_mb: ram_u,
                        ram_total_mb: ram_t,
                        net_down_kbps,
                        net_up_kbps,
                        disk_read_kbps,
                        disk_write_kbps,
                        cpu_name,
                        cpu_freq,
                        disk_total_gb,
                        disk_used_gb,
                        hostname,
                        os,
                        uptime,
                        total_processes,
                        processes: proc_vec,
                        gpus,
                    };

                    let _ = app_handle.emit("sysinfo", payload);

                    thread::sleep(Duration::from_millis(3000));
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
