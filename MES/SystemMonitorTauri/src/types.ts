export interface ProcInfo {
  pid: number;
  name: string;
  cpu: number;
  ram_mb: number;
  disk_total_mb: number;
  threads: number;
}

export interface GpuInfo {
  name: string;
  util: number;
  mem_used: number;
  mem_total: number;
  temp: number;
  is_nvidia: boolean;
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
  gpus: GpuInfo[];
}

export interface ServerStatus {
  timestamp: string;
  ping: number | null;
  http: number | null;
  dbConnect: number | null;
  dbQuery: number | null;
  ftp: number | null;
  nodered: number | null;
  ram: number | null;
  error: string | null;
}
