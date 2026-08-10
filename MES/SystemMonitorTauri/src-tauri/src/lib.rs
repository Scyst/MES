use tauri::{Manager, Emitter};
use sysinfo::{System, ProcessRefreshKind, UpdateKind, RefreshKind, CpuRefreshKind};
use serde::{Serialize, Deserialize};
use std::time::Duration;
use std::thread;

#[derive(Serialize, Clone)]
struct SysPayload {
    cpu_percent: f32,
    ram_used_mb: f64,
    ram_total_mb: f64,
    processes: Vec<ProcInfo>,
}

#[derive(Serialize, Clone)]
struct ProcInfo {
    pid: u32,
    name: String,
    cpu: f32,
    ram_mb: f64,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
                let mut sys = System::new_with_specifics(
                    RefreshKind::new()
                        .with_cpu(CpuRefreshKind::everything())
                        .with_memory()
                        .with_processes(ProcessRefreshKind::new().with_cpu())
                );
                
                // Sleep once so CPU measurement is accurate
                thread::sleep(Duration::from_millis(500));
                
                loop {
                    sys.refresh_cpu_all();
                    sys.refresh_memory();
                    sys.refresh_processes_specifics(ProcessRefreshKind::new().with_cpu().with_memory());
                    
                    let global_cpu = sys.global_cpu_info().cpu_usage();
                    let ram_u = sys.used_memory() as f64 / 1_048_576.0;
                    let ram_t = sys.total_memory() as f64 / 1_048_576.0;
                    
                    let mut proc_vec = Vec::new();
                    for (pid, process) in sys.processes() {
                        let c = process.cpu_usage();
                        let m = process.memory() as f64 / 1_048_576.0;
                        if c > 0.0 || m > 10.0 {
                            proc_vec.push(ProcInfo {
                                pid: pid.as_u32(),
                                name: process.name().to_string(),
                                cpu: c,
                                ram_mb: m,
                            });
                        }
                    }
                    
                    // Sort by CPU
                    proc_vec.sort_by(|a, b| b.cpu.partial_cmp(&a.cpu).unwrap_or(std::cmp::Ordering::Equal));
                    proc_vec.truncate(18); // top 18
                    
                    let payload = SysPayload {
                        cpu_percent: global_cpu,
                        ram_used_mb: ram_u,
                        ram_total_mb: ram_t,
                        processes: proc_vec,
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
