use serde::Serialize;
use std::thread;
use std::time::Duration;
use sysinfo::{Networks, System};
use tauri::{Emitter, Manager};

use winapi::shared::windef::HWND;
use winapi::um::winuser::{
    GetParent, GetWindowLongW, SetWindowLongW, SetWindowPos, ShowWindow, IsWindowVisible,
    GWL_EXSTYLE, WS_EX_TOOLWINDOW, WS_EX_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SW_SHOWNA
};

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

#[tauri::command]
fn set_window_mode(window: tauri::Window) {
    let _ = window.set_always_on_top(false);
    let _ = window.set_decorations(true);
    let _ = window.set_skip_taskbar(false);
    let _ = window.unminimize();
    if let Ok(hwnd) = window.hwnd() {
        unsafe {
            let hwnd_ptr = hwnd.0 as HWND;
            let parent = GetParent(hwnd_ptr);
            let target = if parent.is_null() { hwnd_ptr } else { parent };
            let mut ex = GetWindowLongW(target, GWL_EXSTYLE);
            ex &= !(WS_EX_TOOLWINDOW as i32);
            ex &= !(WS_EX_NOACTIVATE as i32);
            SetWindowLongW(target, GWL_EXSTYLE, ex);
        }
    }
}

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
            let mut ex = GetWindowLongW(target, GWL_EXSTYLE);
            ex &= !(WS_EX_TOOLWINDOW as i32);
            ex &= !(WS_EX_NOACTIVATE as i32);
            SetWindowLongW(target, GWL_EXSTYLE, ex);
        }
    }
}

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
            let mut ex = GetWindowLongW(target, GWL_EXSTYLE);
            ex |= WS_EX_TOOLWINDOW as i32;
            ex |= WS_EX_NOACTIVATE as i32;
            SetWindowLongW(target, GWL_EXSTYLE, ex);
            
            let hwnd_isize = target as isize;
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_millis(800));
                    let h = hwnd_isize as HWND;
                    let current_ex = GetWindowLongW(h, GWL_EXSTYLE);
                    if current_ex & (WS_EX_TOOLWINDOW as i32) == 0 {
                        break;
                    }
                    if IsWindowVisible(h) == 0 {
                        let _ = ShowWindow(h, SW_SHOWNA);
                    }
                    let _ = SetWindowPos(h, 1 as HWND, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
                }
            });
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![exit_app, set_window_mode, set_mini_mode, set_widget_mode])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_handle = app.handle().clone();

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
                    proc_vec.truncate(20); // top 20

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

                    thread::sleep(Duration::from_millis(1000));
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
