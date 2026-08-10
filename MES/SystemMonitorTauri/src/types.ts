export interface ProcInfo {
  pid: number;
  name: string;
  cpu: number;
  ram_mb: number;
  disk_total_mb: number;
  threads: number;
}

export interface SysPayload {
  cpu_percent: number;
  cpu_cores: number[];
  ram_used_mb: number;
  ram_total_mb: number;
  net_down_kbps: number;
  net_up_kbps: number;
  disk_read_kbps: number;
  disk_write_kbps: number;
  temp_c?: number;
  cpu_name: string;
  cpu_freq: number;
  disk_total_gb: number;
  disk_used_gb: number;
  hostname: string;
  os: string;
  uptime: number;
  total_processes: number;
  processes: ProcInfo[];
  gpu_name: string;
  gpu_util: number;
  gpu_mem_used: number;
  gpu_mem_total: number;
  gpu_temp: number;
}
