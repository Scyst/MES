"""
◈  SYSTEM MONITOR — DARK EDITION v4.0
    Cyberpunk real-time performance dashboard.
    Universal — works on any Windows machine.
    Features: Desktop Widget, System Tray, Kill Process, Themes, Mini Widget, Alerts.
    Dependencies: psutil, pystray, Pillow, plyer
"""
import tkinter as tk
from tkinter import ttk, messagebox
import psutil
import platform
import socket
import threading
import time
import subprocess
import csv
import io
import math
import collections
import ctypes
import ctypes.wintypes
import json
import os
import sys

# ═══════════════════════════════════════════════════════════════════════════════
#  THEMES
# ═══════════════════════════════════════════════════════════════════════════════
THEMES = {
    "Cyberpunk": {
        "BG": "#080c14", "BG_CARD": "#0e1525", "BG_CARD_ALT": "#0b1120",
        "BORDER": "#172038", "BORDER_GLOW": "#1a2b50",
        "ACCENT": "#00d4ff", "ACCENT2": "#a855f7", "ACCENT3": "#22c55e",
        "ACCENT4": "#f59e0b", "ACCENT5": "#3b82f6",
        "RED": "#ef4444", "ORANGE": "#f97316",
        "TEXT": "#e2e8f0", "TEXT_DIM": "#64748b",
        "TEXT_MUTED": "#334155", "TEXT_DARK": "#1e293b",
    },
    "Matrix": {
        "BG": "#0a0f0a", "BG_CARD": "#0d1a0d", "BG_CARD_ALT": "#0b150b",
        "BORDER": "#1a3a1a", "BORDER_GLOW": "#1a4a2a",
        "ACCENT": "#00ff41", "ACCENT2": "#39ff14", "ACCENT3": "#00e676",
        "ACCENT4": "#76ff03", "ACCENT5": "#64dd17",
        "RED": "#ff1744", "ORANGE": "#ff9100",
        "TEXT": "#b9f6ca", "TEXT_DIM": "#4caf50",
        "TEXT_MUTED": "#1b5e20", "TEXT_DARK": "#0d2e0d",
    },
    "Nord": {
        "BG": "#2e3440", "BG_CARD": "#3b4252", "BG_CARD_ALT": "#353c4a",
        "BORDER": "#4c566a", "BORDER_GLOW": "#434c5e",
        "ACCENT": "#88c0d0", "ACCENT2": "#b48ead", "ACCENT3": "#a3be8c",
        "ACCENT4": "#ebcb8b", "ACCENT5": "#81a1c1",
        "RED": "#bf616a", "ORANGE": "#d08770",
        "TEXT": "#eceff4", "TEXT_DIM": "#d8dee9",
        "TEXT_MUTED": "#4c566a", "TEXT_DARK": "#3b4252",
    },
    "Dracula": {
        "BG": "#282a36", "BG_CARD": "#343746", "BG_CARD_ALT": "#30334a",
        "BORDER": "#44475a", "BORDER_GLOW": "#6272a4",
        "ACCENT": "#8be9fd", "ACCENT2": "#bd93f9", "ACCENT3": "#50fa7b",
        "ACCENT4": "#f1fa8c", "ACCENT5": "#ff79c6",
        "RED": "#ff5555", "ORANGE": "#ffb86c",
        "TEXT": "#f8f8f2", "TEXT_DIM": "#b0b8d1",
        "TEXT_MUTED": "#44475a", "TEXT_DARK": "#343746",
    },
    "Sunset": {
        "BG": "#1a0a1e", "BG_CARD": "#2a1232", "BG_CARD_ALT": "#221028",
        "BORDER": "#3d1a48", "BORDER_GLOW": "#4a2060",
        "ACCENT": "#ff6b9d", "ACCENT2": "#c084fc", "ACCENT3": "#fb923c",
        "ACCENT4": "#fbbf24", "ACCENT5": "#f472b6",
        "RED": "#ef4444", "ORANGE": "#f97316",
        "TEXT": "#fce7f3", "TEXT_DIM": "#a78bba",
        "TEXT_MUTED": "#4a2060", "TEXT_DARK": "#2a1232",
    },
}

# Active theme — mutable globals
T = dict(THEMES["Cyberpunk"])
FONT = "Consolas"
HISTORY_MAX = 90

APPDATA_DIR = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), "SystemMonitor")
os.makedirs(APPDATA_DIR, exist_ok=True)
CONFIG_PATH = os.path.join(APPDATA_DIR, "sysmon_config.json")
DB_PATH = os.path.join(APPDATA_DIR, "history.db")


def load_config():
    try:
        with open(CONFIG_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return {}

def save_config(cfg):
    try:
        with open(CONFIG_PATH, "w") as f:
            json.dump(cfg, f, indent=2)
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════════════════════
def severity_color(v):
    if v < 50: return T["ACCENT"]
    if v < 70: return T["ACCENT4"]
    if v < 85: return T["ORANGE"]
    return T["RED"]

def dim_color(hex_c, factor=0.25):
    bg = T["BG_CARD"]
    r  = int(bg[1:3],16);   g  = int(bg[3:5],16);   b  = int(bg[5:7],16)
    r2 = int(hex_c[1:3],16);g2 = int(hex_c[3:5],16);b2 = int(hex_c[5:7],16)
    return f"#{int(r+(r2-r)*factor):02x}{int(g+(g2-g)*factor):02x}{int(b+(b2-b)*factor):02x}"

def fmt_speed(kb):
    if kb >= 1024: return f"{kb/1024:.1f} MB/s"
    return f"{kb:.0f} KB/s"

def fmt_uptime(s):
    d, s = divmod(int(s), 86400)
    h, s = divmod(s, 3600)
    m = s // 60
    parts = []
    if d: parts.append(f"{d}d")
    parts += [f"{h}h", f"{m}m"]
    return " ".join(parts)

def get_cpu_name():
    try:
        out = subprocess.check_output(["wmic","cpu","get","name"],
                                       creationflags=0x08000000, timeout=3).decode().strip()
        lines = [l.strip() for l in out.split("\n") if l.strip() and l.strip()!="Name"]
        if lines: return lines[0]
    except Exception: pass
    return platform.processor() or "Unknown CPU"


# ─── GPU ─────────────────────────────────────────────────────────────────────
def detect_gpu_vendor():
    try:
        subprocess.check_output(["nvidia-smi","-L"], creationflags=0x08000000, timeout=3)
        return "NVIDIA"
    except Exception: pass
    try:
        out = subprocess.check_output(["wmic","path","win32_VideoController","get","name"],
                                       creationflags=0x08000000, timeout=3).decode().lower()
        if "nvidia" in out: return "NVIDIA"
        if "amd" in out or "radeon" in out: return "AMD"
        if "intel" in out: return "Intel"
    except Exception: pass
    return "Unknown"

def get_gpu_name():
    try:
        out = subprocess.check_output(["wmic","path","win32_VideoController","get","name"],
                                       creationflags=0x08000000, timeout=3).decode()
        lines = [l.strip() for l in out.split("\n") if l.strip() and l.strip()!="Name"]
        return " + ".join(lines) if lines else "Unknown"
    except Exception: return "Unknown"

def get_nvidia_info():
    try:
        out = subprocess.check_output(
            ["nvidia-smi",
             "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu",
             "--format=csv,noheader,nounits"],
            creationflags=0x08000000, timeout=3
        ).decode().strip()
        parts = [p.strip() for p in out.split(",")]
        if len(parts) >= 4:
            return int(parts[0]), int(parts[1]), int(parts[2]), int(parts[3])
    except Exception: pass
    return 0, 0, 0, 0

def get_total_gpu_3d():
    try:
        out = subprocess.check_output(
            ["typeperf", r"\GPU Engine(*engtype_3D)\Utilization Percentage", "-sc", "1"],
            creationflags=0x08000000, timeout=5
        ).decode(errors="ignore").strip().split("\n")
        if len(out) >= 2:
            vals = next(csv.reader(io.StringIO(out[1])))
            return min(100.0, sum(float(v) for v in vals[1:] if v.strip()))
    except Exception: pass
    return 0.0


# ─── TRAY ICON ───────────────────────────────────────────────────────────────
def create_tray_icon(app):
    """Create system tray icon. Returns the icon object or None."""
    try:
        import pystray
        from PIL import Image, ImageDraw
    except ImportError:
        return None

    # generate a small neon icon
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([4, 4, 60, 60], fill=(0, 212, 255, 230))
    draw.ellipse([14, 14, 50, 50], fill=(8, 12, 20, 255))
    draw.text((20, 18), "S", fill=(0, 212, 255, 255))

    def on_show(icon, item):
        app.after(0, app._tray_show)

    def on_mini(icon, item):
        app.after(0, app._toggle_mini)

    def on_exit(icon, item):
        icon.stop()
        app.after(0, app._quit)

    menu = pystray.Menu(
        pystray.MenuItem("Show / Hide", on_show, default=True),
        pystray.MenuItem("Mini Widget", on_mini),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Exit", on_exit),
    )

    icon = pystray.Icon("SysMon", img, "System Monitor", menu)
    threading.Thread(target=icon.run, daemon=True).start()
    return icon


# ─── ALERTS ──────────────────────────────────────────────────────────────────
class AlertManager:
    """Sends toast notifications when resources exceed thresholds."""

    def __init__(self):
        self._last_cpu_alert = 0
        self._last_ram_alert = 0
        self._cooldown = 30  # seconds between repeated alerts
        self._enabled = True
        try:
            from plyer import notification
            self._notify = notification.notify
        except ImportError:
            self._notify = None

    def check(self, cpu, ram_pct):
        if not self._enabled or not self._notify:
            return
        now = time.time()
        if cpu > 90 and now - self._last_cpu_alert > self._cooldown:
            self._last_cpu_alert = now
            threading.Thread(target=self._send,
                             args=("⚠ CPU Alert", f"CPU usage is {cpu:.0f}%!"),
                             daemon=True).start()
        if ram_pct > 90 and now - self._last_ram_alert > self._cooldown:
            self._last_ram_alert = now
            threading.Thread(target=self._send,
                             args=("⚠ RAM Alert", f"RAM usage is {ram_pct:.0f}%!"),
                             daemon=True).start()

    def _send(self, title, msg):
        try:
            self._notify(title=title, message=msg, app_name="System Monitor",
                         timeout=5)
        except Exception:
            pass


# ═══════════════════════════════════════════════════════════════════════════════
#  WIDGETS
# ═══════════════════════════════════════════════════════════════════════════════

class GlowGauge(tk.Canvas):
    def __init__(self, master, label="", color=None, size=130, **kw):
        super().__init__(master, width=size, height=size+8,
                         bg=T["BG_CARD"], highlightthickness=0, **kw)
        self.label = label
        self.color = color or T["ACCENT"]
        self.sz = size
        self._v = 0.0
        self._tgt = 0.0
        self._sub = ""
        self._draw()

    def set(self, v, sub=""):
        self._tgt = max(0, min(100, float(v)))
        self._sub = sub
        self._animate()

    def _animate(self):
        d = self._tgt - self._v
        if abs(d) > 0.4:
            self._v += d * 0.16
            self._draw()
            self.after(20, self._animate)
        else:
            self._v = self._tgt
            self._draw()

    def _draw(self):
        self.delete("all")
        cx = cy = self.sz // 2
        r = self.sz // 2 - 16
        v = self._v
        col = severity_color(v)

        for i in range(28):
            a = math.radians(225 - i * (270/27))
            x1, y1 = cx + (r+6)*math.cos(a), cy - (r+6)*math.sin(a)
            x2, y2 = cx + (r+10)*math.cos(a), cy - (r+10)*math.sin(a)
            tc = T["TEXT_MUTED"] if i/27*100 > v else dim_color(col, 0.5)
            self.create_line(x1, y1, x2, y2, fill=tc, width=1)

        self.create_arc(cx-r,cy-r,cx+r,cy+r, start=225, extent=-270,
                        style="arc", outline=T["TEXT_DARK"], width=7)

        ext = -270 * v / 100
        if abs(ext) > 1:
            gr = r + 2
            self.create_arc(cx-gr,cy-gr,cx+gr,cy+gr, start=225, extent=ext,
                            style="arc", outline=dim_color(col, 0.25), width=13)
            self.create_arc(cx-r,cy-r,cx+r,cy+r, start=225, extent=ext,
                            style="arc", outline=col, width=6)
            a = math.radians(225 + ext)
            dx, dy = r*math.cos(a), -r*math.sin(a)
            self.create_oval(cx+dx-6,cy+dy-6,cx+dx+6,cy+dy+6,
                             fill=dim_color(col,0.3), outline="")
            self.create_oval(cx+dx-3,cy+dy-3,cx+dx+3,cy+dy+3,
                             fill=col, outline="")

        self.create_text(cx, cy-10, text=f"{v:.0f}%",
                         fill=T["TEXT"], font=(FONT, 17, "bold"))
        self.create_text(cx, cy+12, text=self.label,
                         fill=T["TEXT_DIM"], font=(FONT, 8))
        if self._sub:
            self.create_text(cx, cy+26, text=self._sub,
                             fill=dim_color(col, 0.7), font=(FONT, 8))

    def recolor(self):
        self.config(bg=T["BG_CARD"])
        self._draw()


class SparkGraph(tk.Canvas):
    def __init__(self, master, color=None, h=62, **kw):
        super().__init__(master, height=h, bg=T["BG_CARD"], highlightthickness=0, **kw)
        self.color = color
        self.H = h
        self.data = collections.deque([0.0]*HISTORY_MAX, maxlen=HISTORY_MAX)
        self._label = ""
        self._grid = [self.create_line(0,0,0,0, dash=(2,6)) for _ in range(3)]
        self._poly = self.create_polygon(0,0,0,0,0,0, outline="")
        self._line = self.create_line(0,0,0,0, width=2, smooth=True)
        self._text_val = self.create_text(0,0, anchor="ne", font=(FONT, 9, "bold"))
        self._text_lbl = self.create_text(0,0, anchor="nw", font=(FONT, 8))
        self.bind("<Configure>", self._on_cfg)

    def _on_cfg(self, e):
        self._draw()

    def push(self, value, label=""):
        self.data.append(max(0, min(100, float(value))))
        self._label = label
        self._draw()

    def _draw(self):
        w = self.winfo_width()
        h = self.H
        if w < 20: return
        pad = 4
        pts = list(self.data)
        n = len(pts)
        c = self.color or T["ACCENT"]

        for i, pct in enumerate((25, 50, 75)):
            y = h - pad - pct*(h-2*pad)/100
            self.coords(self._grid[i], pad, y, w-pad, y)
            self.itemconfig(self._grid[i], fill=T["TEXT_DARK"])

        coords = []
        for i, v in enumerate(pts):
            coords.extend([pad + i*(w-2*pad)/(n-1), h - pad - v*(h-2*pad)/100])
        
        if len(coords) >= 4:
            self.coords(self._line, *coords)
            self.itemconfig(self._line, fill=c)
            
            poly_coords = coords[:]
            poly_coords.extend([coords[-2], h-pad, coords[0], h-pad])
            self.coords(self._poly, *poly_coords)
            self.itemconfig(self._poly, fill=dim_color(c, 0.10))

        cur = pts[-1] if pts else 0
        self.coords(self._text_val, w-6, 6)
        self.itemconfig(self._text_val, text=f"{cur:.0f}%", fill=c)
        
        self.coords(self._text_lbl, 6, 6)
        self.itemconfig(self._text_lbl, text=self._label, fill=T["TEXT_DIM"])

    def recolor(self):
        self.config(bg=T["BG_CARD"])
        self._draw()


class CoreBars(tk.Canvas):
    def __init__(self, master, num_cores=4, **kw):
        self.num = num_cores
        self.bar_h = 14
        self.gap = 4
        rows = math.ceil(num_cores / 4)
        h = rows * (self.bar_h + self.gap) + self.gap + 4
        super().__init__(master, height=h, bg=T["BG_CARD"], highlightthickness=0, **kw)
        self._vals = [0.0] * num_cores
        
        self._items = []
        for i in range(num_cores):
            lbl_id = self.create_text(0,0, anchor="w", font=(FONT, 8))
            bg_id = self.create_rectangle(0,0,0,0, outline="")
            fg_id = self.create_rectangle(0,0,0,0, outline="")
            val_id = self.create_text(0,0, anchor="w", font=(FONT, 7))
            self._items.append((lbl_id, bg_id, fg_id, val_id))
            
        self.bind("<Configure>", self._on_cfg)

    def _on_cfg(self, e):
        self._draw()

    def set(self, values):
        self._vals = values[:self.num]
        self._draw()

    def _draw(self):
        w = self.winfo_width()
        if w < 40: return
        col_w = w // 4
        for i, v in enumerate(self._vals):
            c = i % 4
            r = i // 4
            x0 = c * col_w + 8
            y0 = r * (self.bar_h + self.gap) + self.gap + 2
            bw = max(1, col_w - 56)
            
            lbl_id, bg_id, fg_id, val_id = self._items[i]
            
            self.coords(lbl_id, x0, y0 + self.bar_h//2)
            self.itemconfig(lbl_id, text=f"C{i}", fill=T["TEXT_DIM"])
            
            bx = x0 + 24
            self.coords(bg_id, bx, y0, bx+bw, y0+self.bar_h)
            self.itemconfig(bg_id, fill=T["TEXT_DARK"])
            
            fw = max(0.1, bw * v / 100)
            self.coords(fg_id, bx, y0, bx+fw, y0+self.bar_h)
            self.itemconfig(fg_id, fill=severity_color(v))
            
            self.coords(val_id, bx+bw+4, y0+self.bar_h//2)
            self.itemconfig(val_id, text=f"{v:.0f}%", fill=T["TEXT_DIM"])

    def recolor(self):
        self.config(bg=T["BG_CARD"])
        self._draw()


class BatteryWidget(tk.Canvas):
    def __init__(self, master, w=130, h=55, **kw):
        super().__init__(master, width=w, height=h, bg=T["BG_CARD"], highlightthickness=0, **kw)
        self.W, self.H = w, h
        self._pct, self._plug, self._avail = 0, False, False
        self._draw()

    def set(self, pct, plug, avail):
        self._pct, self._plug, self._avail = pct, plug, avail
        self._draw()

    def _draw(self):
        self.delete("all")
        cx, cy = self.W//2, self.H//2
        if not self._avail:
            self.create_text(cx, cy, text="No Battery",
                             fill=T["TEXT_MUTED"], font=(FONT, 9))
            return
        bw, bh = 50, 24
        bx, by = cx-bw//2, cy-bh//2-4
        self.create_rectangle(bx,by,bx+bw,by+bh, outline=T["TEXT_DIM"], width=2)
        self.create_rectangle(bx+bw,by+6,bx+bw+4,by+bh-6, fill=T["TEXT_DIM"], outline="")
        p = self._pct
        col = T["ACCENT3"] if p > 60 else T["ACCENT4"] if p > 25 else T["RED"]
        fw = max(0, (bw-4)*p/100)
        if fw > 0:
            self.create_rectangle(bx+2,by+2,bx+2+fw,by+bh-2, fill=col, outline="")
        self.create_text(cx, by+bh+10,
                         text=f"{p}%{'  ⚡' if self._plug else ''}",
                         fill=col, font=(FONT, 10, "bold"))

    def recolor(self):
        self.config(bg=T["BG_CARD"])
        self._draw()


class StatBadge(tk.Frame):
    def __init__(self, master, icon="●", label="", color=None, **kw):
        super().__init__(master, bg=T["BG_CARD"], **kw)
        self.config(highlightbackground=T["BORDER"], highlightthickness=1)
        self._color = color or T["ACCENT"]
        self._icon_lbl = tk.Label(self, text=icon, fg=self._color, bg=T["BG_CARD"],
                                   font=(FONT, 14))
        self._icon_lbl.pack(side="left", padx=(8,4))
        rt = tk.Frame(self, bg=T["BG_CARD"])
        rt.pack(side="left", fill="x", expand=True, padx=(0,8))
        self._rt = rt
        self.v = tk.Label(rt, text="—", fg=T["TEXT"], bg=T["BG_CARD"],
                          font=(FONT, 11, "bold"), anchor="w")
        self.v.pack(anchor="w")
        self._lbl = tk.Label(rt, text=label, fg=T["TEXT_DIM"], bg=T["BG_CARD"],
                              font=(FONT, 8), anchor="w")
        self._lbl.pack(anchor="w")

    def set(self, txt, color=None):
        self.v.config(text=txt, fg=color or self._color)

    def recolor(self):
        self.config(bg=T["BG_CARD"], highlightbackground=T["BORDER"])
        self._icon_lbl.config(bg=T["BG_CARD"])
        self.v.config(bg=T["BG_CARD"])
        self._lbl.config(bg=T["BG_CARD"], fg=T["TEXT_DIM"])
        self._rt.config(bg=T["BG_CARD"])


# ═══════════════════════════════════════════════════════════════════════════════
#  MINI WIDGET (compact floating bar)
# ═══════════════════════════════════════════════════════════════════════════════

class MiniWidget(tk.Toplevel):
    """Tiny floating bar showing CPU/RAM/GPU."""

    def __init__(self, master):
        super().__init__(master)
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        self.attributes("-alpha", 0.92)
        self.configure(bg=T["BG"])
        self.geometry("320x50+20+20")
        self._drag = {"x": 0, "y": 0}

        bar = tk.Frame(self, bg=T["BG"])
        bar.pack(fill="both", expand=True, padx=4, pady=4)
        bar.bind("<ButtonPress-1>", self._start_drag)
        bar.bind("<B1-Motion>", self._do_drag)
        bar.bind("<Double-Button-1>", lambda e: master._toggle_mini())

        self._bars = {}
        for name, color in [("CPU", T["ACCENT"]), ("RAM", T["ACCENT2"]), ("GPU", T["ACCENT3"])]:
            f = tk.Frame(bar, bg=T["BG"])
            f.pack(side="left", expand=True, fill="both", padx=2)
            f.bind("<ButtonPress-1>", self._start_drag)
            f.bind("<B1-Motion>", self._do_drag)
            f.bind("<Double-Button-1>", lambda e: master._toggle_mini())
            lbl = tk.Label(f, text=f"{name}: 0%", fg=color, bg=T["BG"],
                           font=(FONT, 10, "bold"))
            lbl.pack(side="left", padx=4)
            lbl.bind("<ButtonPress-1>", self._start_drag)
            lbl.bind("<B1-Motion>", self._do_drag)
            lbl.bind("<Double-Button-1>", lambda e: master._toggle_mini())

            cvs = tk.Canvas(f, width=60, height=10, bg=T["TEXT_DARK"], highlightthickness=0)
            cvs.pack(side="left", padx=2, pady=6)
            self._bars[name] = (lbl, cvs, color)

        # right-click to close
        self.bind("<Button-3>", lambda e: master._toggle_mini())

    def update_values(self, cpu, ram, gpu):
        for name, val in [("CPU", cpu), ("RAM", ram), ("GPU", gpu)]:
            lbl, cvs, color = self._bars[name]
            lbl.config(text=f"{name}: {val:.0f}%")
            cvs.delete("all")
            w = cvs.winfo_width()
            fw = max(0, w * val / 100)
            if fw > 0:
                cvs.create_rectangle(0, 0, fw, 12, fill=severity_color(val), outline="")

    def _start_drag(self, e):
        self._drag["x"] = e.x
        self._drag["y"] = e.y

    def _do_drag(self, e):
        x = self.winfo_x() + e.x - self._drag["x"]
        y = self.winfo_y() + e.y - self._drag["y"]
        self.geometry(f"+{x}+{y}")


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN APPLICATION
# ═══════════════════════════════════════════════════════════════════════════════

class App(tk.Tk):

    def __init__(self):
        super().__init__()
        cfg = load_config()
        theme_name = cfg.get("theme", "Cyberpunk")
        if theme_name in THEMES:
            T.update(THEMES[theme_name])
        self._current_theme = theme_name

        self.title("◈ SYSTEM MONITOR v4.0")
        self.geometry("1120x760")
        self.configure(bg=T["BG"])
        self.minsize(800, 500)

        self._running       = True
        self._desktop_mode  = False
        self._mini_mode     = False
        self._mini_widget   = None
        self._opacity       = 1.0
        self._drag_data     = {"x": 0, "y": 0}
        self._last_net      = psutil.net_io_counters()
        self._last_net_t    = time.time()
        self._last_dio      = psutil.disk_io_counters()
        self._last_dio_t    = time.time()
        self._gpu_vendor    = "detecting"
        self._gpu_util      = 0
        self._gpu_mem_u     = 0
        self._gpu_mem_t     = 0
        self._gpu_temp      = 0
        self._gpu_3d        = 0.0
        self._num_cores     = psutil.cpu_count(logical=True) or 4
        self._cpu_name      = get_cpu_name()
        self._tray_icon     = None
        self._alerts        = AlertManager()
        self._alerts_enabled= cfg.get("alerts", True)
        self._alerts._enabled = self._alerts_enabled

        self._build_ui()
        self._build_context_menu()
        self._build_process_menu()
        self._start_threads()

        # System tray
        self._tray_icon = create_tray_icon(self)

        self.protocol("WM_DELETE_WINDOW", self._on_close)
        self.bind("<Unmap>", self._on_unmap)
        self._prevent_minimize = True
        self._ram_total_mb = psutil.virtual_memory().total / 1048576
        
        # Start in Desktop Widget Mode by default
        self.after(100, self._to_desktop)

    def _on_unmap(self, event):
        if event.widget == self and self._prevent_minimize and not getattr(self, '_mini_mode', False):
            self.after(50, self.deiconify)

    # ──────────────────────────────────────────────────────────────────────────
    #  UI
    # ──────────────────────────────────────────────────────────────────────────
    def _build_ui(self):
        self._root_frame = tk.Frame(self, bg=T["BG"])
        self._root_frame.pack(fill="both", expand=True)
        root = self._root_frame

        # BANNER
        banner = tk.Frame(root, bg=T["BG"])
        banner.pack(fill="x", padx=16, pady=(10,2))
        self._banner = banner
        banner.bind("<ButtonPress-1>", self._start_drag)
        banner.bind("<B1-Motion>", self._do_drag)

        self.title_lbl = tk.Label(banner, text="◈ SYSTEM MONITOR",
                                   fg=T["ACCENT"], bg=T["BG"], font=(FONT, 16, "bold"))
        self.title_lbl.pack(side="left")
        self.title_lbl.bind("<ButtonPress-1>", self._start_drag)
        self.title_lbl.bind("<B1-Motion>", self._do_drag)

        self.mode_lbl = tk.Label(banner, text="", fg=T["TEXT_MUTED"], bg=T["BG"],
                                  font=(FONT, 9))
        self.mode_lbl.pack(side="left", padx=(10,0))

        rt = tk.Frame(banner, bg=T["BG"])
        rt.pack(side="right")
        self.clock_lbl = tk.Label(rt, text="", fg=T["TEXT_DIM"], bg=T["BG"],
                                   font=(FONT, 11))
        self.clock_lbl.pack(side="right", padx=(12,0))
        self.up_lbl = tk.Label(rt, text="", fg=T["TEXT_MUTED"], bg=T["BG"],
                                font=(FONT, 9))
        self.up_lbl.pack(side="right")

        # sys info
        info = tk.Frame(root, bg=T["BG"])
        info.pack(fill="x", padx=16, pady=(0,2))
        hn = socket.gethostname()
        osv = f"Windows {platform.version()}"
        tram = f"{psutil.virtual_memory().total/(1024**3):.0f} GB"
        self.sysinfo_lbl = tk.Label(info,
            text=f"{hn}  •  {self._cpu_name[:55]}  •  {tram} RAM  •  {osv}",
            fg=T["TEXT_MUTED"], bg=T["BG"], font=(FONT, 8))
        self.sysinfo_lbl.pack(side="left")
        self.gpu_name_lbl = tk.Label(info, text="GPU: detecting...",
                                      fg=T["TEXT_MUTED"], bg=T["BG"], font=(FONT, 8))
        self.gpu_name_lbl.pack(side="right")

        tk.Frame(root, bg=T["BORDER"], height=1).pack(fill="x", padx=16, pady=4)

        # GAUGES
        g_row = tk.Frame(root, bg=T["BG"])
        g_row.pack(fill="x", padx=12, pady=4)
        self.g_cpu  = self._mkgauge(g_row, "CPU",   T["ACCENT"])
        self.g_ram  = self._mkgauge(g_row, "RAM",   T["ACCENT2"])
        self.g_gpu  = self._mkgauge(g_row, "GPU",   T["ACCENT3"])
        self.g_3d   = self._mkgauge(g_row, "GPU 3D\nTotal", T["ACCENT4"])
        self.g_disk = self._mkgauge(g_row, "Disk",  T["ACCENT5"])

        bat_card = tk.Frame(g_row, bg=T["BG_CARD"])
        bat_card.pack(side="left", expand=True, fill="both", padx=4, pady=2)
        self.bat = BatteryWidget(bat_card, w=130, h=55)
        self.bat.pack(padx=10, pady=16)

        # CPU CORES
        cores_card = tk.Frame(root, bg=T["BG_CARD"])
        cores_card.pack(fill="x", padx=16, pady=4)
        self._cores_lbl = tk.Label(cores_card, text="CPU CORES", fg=T["TEXT_DIM"],
                                    bg=T["BG_CARD"], font=(FONT, 9, "bold"))
        self._cores_lbl.pack(anchor="w", padx=10, pady=(6,0))
        self.core_bars = CoreBars(cores_card, num_cores=self._num_cores)
        self.core_bars.pack(padx=8, pady=(2,8), fill="x")
        self._cores_card = cores_card

        # GRAPHS
        gr_row = tk.Frame(root, bg=T["BG"])
        gr_row.pack(fill="x", padx=16, pady=4)
        gc1 = tk.Frame(gr_row, bg=T["BG_CARD"])
        gc1.pack(side="left", expand=True, fill="both", padx=4, pady=2)
        self.graph_cpu = SparkGraph(gc1, color=T["ACCENT"], h=62)
        self.graph_cpu.pack(padx=8, pady=(6,8), fill="x", expand=True)
        gc2 = tk.Frame(gr_row, bg=T["BG_CARD"])
        gc2.pack(side="left", expand=True, fill="both", padx=4, pady=2)
        self.graph_ram = SparkGraph(gc2, color=T["ACCENT2"], h=62)
        self.graph_ram.pack(padx=8, pady=(6,8), fill="x", expand=True)
        self._graph_cards = [gc1, gc2]

        # BADGES
        b_row = tk.Frame(root, bg=T["BG"])
        b_row.pack(fill="x", padx=16, pady=4)
        self.b_dl   = self._mkbadge(b_row, "↓", "Download",   T["ACCENT3"])
        self.b_ul   = self._mkbadge(b_row, "↑", "Upload",     T["ACCENT"])
        self.b_dr   = self._mkbadge(b_row, "◂", "Disk Read",  T["ACCENT5"])
        self.b_dw   = self._mkbadge(b_row, "▸", "Disk Write", T["ACCENT4"])
        self.b_temp = self._mkbadge(b_row, "🌡","GPU Temp",   T["RED"])
        self.b_vram = self._mkbadge(b_row, "▣", "VRAM",       T["ACCENT3"])
        self.b_proc = self._mkbadge(b_row, "⬡", "Processes",  T["TEXT_DIM"])

        tk.Frame(root, bg=T["BORDER"], height=1).pack(fill="x", padx=16, pady=4)

        # PROCESS TABLE
        th = tk.Frame(root, bg=T["BG"])
        th.pack(fill="x", padx=16)
        self._proc_title = tk.Label(th, text="TOP PROCESSES", fg=T["ACCENT"], bg=T["BG"],
                                     font=(FONT, 11, "bold"))
        self._proc_title.pack(side="left")

        self.sort_var = tk.StringVar(value="RAM")
        sf = tk.Frame(th, bg=T["BG"])
        sf.pack(side="right")
        tk.Label(sf, text="Sort:", fg=T["TEXT_DIM"], bg=T["BG"],
                 font=(FONT, 9)).pack(side="left")
        for opt in ("RAM", "CPU"):
            tk.Radiobutton(sf, text=opt, variable=self.sort_var, value=opt,
                           fg=T["TEXT_DIM"], bg=T["BG"], selectcolor=T["BG"],
                           activebackground=T["BG"], activeforeground=T["ACCENT"],
                           font=(FONT, 9), indicatoron=0, padx=8, pady=2,
                           bd=0, highlightbackground=T["BORDER"]).pack(side="left", padx=3)

        tf = tk.Frame(root, bg=T["BG"])
        tf.pack(fill="both", expand=True, padx=16, pady=(4,12))

        cols = ("PID", "Name", "CPU", "RAM", "Disk (MB Total)", "Threads")
        self.tree = ttk.Treeview(tf, columns=cols, show="headings",
                                  selectmode="browse", height=12)
        cw_map = {"PID":60,"Name":280,"CPU":110,"RAM":170,"Disk (MB Total)":100,"Threads":60}
        for c in cols:
            self.tree.heading(c, text=c)
            self.tree.column(c, width=cw_map[c],
                             anchor="center" if c != "Name" else "w")

        self._apply_tree_style()

        vs = ttk.Scrollbar(tf, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vs.set)
        self.tree.pack(side="left", fill="both", expand=True)
        vs.pack(side="right", fill="y")

        self.tree.tag_configure("odd",  background=dim_color(T["ACCENT"], 0.05))
        self.tree.tag_configure("even", background=T["BG_CARD"])
        self.tree.tag_configure("hot",  background=dim_color(T["RED"], 0.15), foreground=T["RED"])

        self._tick_clock()

    def _apply_tree_style(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("Treeview",
                         background=T["BG_CARD"], foreground=T["TEXT"],
                         fieldbackground=T["BG_CARD"], rowheight=24,
                         font=(FONT, 10))
        style.configure("Treeview.Heading",
                         background=T["BG_CARD_ALT"], foreground=T["ACCENT"],
                         font=(FONT, 10, "bold"), borderwidth=0)
        style.map("Treeview",
                  background=[("selected", T["BORDER_GLOW"])],
                  foreground=[("selected", T["ACCENT"])])

    def _mkgauge(self, parent, label, color):
        card = tk.Frame(parent, bg=T["BG_CARD"])
        card.pack(side="left", expand=True, fill="both", padx=4, pady=2)
        g = GlowGauge(card, label=label, color=color, size=130)
        g.pack(padx=10, pady=10)
        return g

    def _mkbadge(self, parent, icon, label, color):
        b = StatBadge(parent, icon=icon, label=label, color=color)
        b.pack(side="left", expand=True, fill="x", padx=3, pady=2,
               ipadx=4, ipady=5)
        return b

    # ──────────────────────────────────────────────────────────────────────────
    #  CONTEXT MENUS
    # ──────────────────────────────────────────────────────────────────────────
    def _build_context_menu(self):
        self.ctx = tk.Menu(self, tearoff=0, bg=T["BG_CARD"], fg=T["TEXT"],
                            activebackground=T["BORDER_GLOW"], activeforeground=T["ACCENT"],
                            font=(FONT, 10))
        self.ctx.add_command(label="🖥  Window Mode",      command=self._to_window)
        self.ctx.add_command(label="📌  Desktop Widget",    command=self._to_desktop)
        self.ctx.add_command(label="📊  Mini Widget",       command=self._toggle_mini)
        self.ctx.add_separator()
        self.ctx.add_command(label="🔲  Maximize",          command=self._maximize)
        self.ctx.add_separator()

        # Theme sub-menu
        theme_menu = tk.Menu(self.ctx, tearoff=0, bg=T["BG_CARD"], fg=T["TEXT"],
                              activebackground=T["BORDER_GLOW"], activeforeground=T["ACCENT"],
                              font=(FONT, 10))
        for name in THEMES:
            theme_menu.add_command(label=f"  {name}",
                                    command=lambda n=name: self._switch_theme(n))
        self.ctx.add_cascade(label="🎨  Theme", menu=theme_menu)

        # Opacity sub-menu
        opa_menu = tk.Menu(self.ctx, tearoff=0, bg=T["BG_CARD"], fg=T["TEXT"],
                            activebackground=T["BORDER_GLOW"], activeforeground=T["ACCENT"],
                            font=(FONT, 10))
        for pct in (100, 90, 80, 70, 60, 50):
            opa_menu.add_command(label=f"  {pct}%",
                                 command=lambda p=pct: self._set_opacity(p/100))
        self.ctx.add_cascade(label="🌗  Opacity", menu=opa_menu)

        # Alerts toggle
        self.ctx.add_separator()
        self._alerts_var = tk.BooleanVar(value=self._alerts_enabled)
        self.ctx.add_checkbutton(label="🔔  Alerts (CPU/RAM > 90%)",
                                  variable=self._alerts_var,
                                  command=self._toggle_alerts)

        # Autostart toggle
        self._autostart_var = tk.BooleanVar(value=self._check_autostart())
        self.ctx.add_checkbutton(label="🚀  Run at Startup",
                                  variable=self._autostart_var,
                                  command=self._toggle_autostart)
        
        self.ctx.add_separator()
        self.ctx.add_command(label="❌  Exit", command=self._quit)

        self.bind("<Button-3>", self._show_ctx)

    def _show_ctx(self, event):
        try:
            self.ctx.tk_popup(event.x_root, event.y_root)
        finally:
            self.ctx.grab_release()

    def _build_process_menu(self):
        """Right-click menu on process table rows."""
        self.proc_ctx = tk.Menu(self, tearoff=0, bg=T["BG_CARD"], fg=T["TEXT"],
                                 activebackground=T["BORDER_GLOW"], activeforeground=T["RED"],
                                 font=(FONT, 10))
        self.proc_ctx.add_command(label="☠  End Task", command=self._kill_selected)
        self.proc_ctx.add_command(label="📋  Copy PID", command=self._copy_pid)
        self.tree.bind("<Button-3>", self._show_proc_ctx)

    def _show_proc_ctx(self, event):
        item = self.tree.identify_row(event.y)
        if item:
            self.tree.selection_set(item)
            try:
                self.proc_ctx.tk_popup(event.x_root, event.y_root)
            finally:
                self.proc_ctx.grab_release()

    def _kill_selected(self):
        sel = self.tree.selection()
        if not sel:
            return
        vals = self.tree.item(sel[0], "values")
        pid = int(vals[0])
        name = vals[1]
        if messagebox.askyesno("End Task",
                                f"Kill process '{name}' (PID {pid})?",
                                icon="warning"):
            try:
                p = psutil.Process(pid)
                p.terminate()
            except Exception as e:
                messagebox.showerror("Error", f"Could not kill process:\n{e}")

    def _copy_pid(self):
        sel = self.tree.selection()
        if sel:
            pid = self.tree.item(sel[0], "values")[0]
            self.clipboard_clear()
            self.clipboard_append(str(pid))

    # ──────────────────────────────────────────────────────────────────────────
    #  THEMES
    # ──────────────────────────────────────────────────────────────────────────
    def _switch_theme(self, name):
        if name not in THEMES or name == self._current_theme:
            return
        T.update(THEMES[name])
        self._current_theme = name
        save_config({"theme": name, "alerts": self._alerts_enabled})

        # Rebuild — simplest reliable approach for full theme swap
        self._root_frame.destroy()
        self._build_ui()
        self._build_context_menu()
        self._build_process_menu()
        self.configure(bg=T["BG"])

    # ──────────────────────────────────────────────────────────────────────────
    #  ALERTS
    # ──────────────────────────────────────────────────────────────────────────
    def _toggle_alerts(self):
        self._alerts_enabled = self._alerts_var.get()
        self._alerts._enabled = self._alerts_enabled
        save_config({"theme": self._current_theme, "alerts": self._alerts_enabled})
        if self._alerts_enabled:
            self._alerts._send("🔔 Alerts Enabled", "ระบบแจ้งเตือนทำงานแล้ว!")

    # ──────────────────────────────────────────────────────────────────────────
    #  AUTO-START
    # ──────────────────────────────────────────────────────────────────────────
    def _check_autostart(self):
        try:
            startup_path = os.path.join(os.environ.get("APPDATA"), r"Microsoft\Windows\Start Menu\Programs\Startup\SystemMonitor.vbs")
            return os.path.exists(startup_path)
        except Exception: return False

    def _toggle_autostart(self):
        try:
            startup_path = os.path.join(os.environ.get("APPDATA"), r"Microsoft\Windows\Start Menu\Programs\Startup\SystemMonitor.vbs")
            if self._autostart_var.get():
                exe_path = os.path.abspath(sys.argv[0])
                with open(startup_path, "w") as f:
                    if exe_path.endswith('.py'):
                        f.write(f'Set WshShell = CreateObject("WScript.Shell")\nWshShell.Run "pythonw ""{exe_path}""", 0, False')
                    else:
                        f.write(f'Set WshShell = CreateObject("WScript.Shell")\nWshShell.Run """{exe_path}""", 0, False')
                messagebox.showinfo("🚀 Auto-Start", f"ตั้งค่าให้เปิดอัตโนมัติสำเร็จ!\nโปรแกรมจะเริ่มทำงานทุกครั้งที่เปิดเครื่อง\n\nตำแหน่งไฟล์ Shortcut:\n{startup_path}")
            else:
                if os.path.exists(startup_path):
                    os.remove(startup_path)
                messagebox.showinfo("❌ Auto-Start", "ปิดใช้งานการเปิดอัตโนมัติเรียบร้อยแล้ว")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to toggle auto-start:\n{e}")

    # ──────────────────────────────────────────────────────────────────────────
    #  MODES
    # ──────────────────────────────────────────────────────────────────────────
    def _to_desktop(self):
        if self._desktop_mode: return
        self._desktop_mode = True
        self.withdraw()
        self.overrideredirect(True)
        self.deiconify()
        self.update_idletasks()
        try:
            hwnd = ctypes.windll.user32.GetParent(self.winfo_id())
            GWL_EXSTYLE = -20
            ex = ctypes.windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            ex = (ex | 0x00000080 | 0x08000000) & ~0x00040000
            ctypes.windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, ex)
        except Exception: pass
        self.attributes("-alpha", 0.88)
        self.mode_lbl.config(text="[ Desktop Widget — Right-click for menu ]",
                              fg=T["ACCENT3"])
        self._keep_bottom()

    def _keep_bottom(self):
        if self._desktop_mode and self._running:
            try:
                hwnd = ctypes.windll.user32.GetParent(self.winfo_id())
                ctypes.windll.user32.SetWindowPos(hwnd, 1, 0, 0, 0, 0,
                                                   0x0001|0x0002|0x0010)
                
                # If Win+D hides the window, forcefully show it back!
                if not ctypes.windll.user32.IsWindowVisible(hwnd):
                    ctypes.windll.user32.ShowWindow(hwnd, 8) # SW_SHOWNA
                    
                # Enforce TOOLWINDOW and NOAPPWINDOW to completely hide from taskbar
                GWL_EXSTYLE = -20
                ex = ctypes.windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
                new_ex = (ex | 0x00000080 | 0x08000000) & ~0x00040000
                if ex != new_ex:
                    ctypes.windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, new_ex)
            except Exception: pass
            self.after(800, self._keep_bottom)

    def _to_window(self):
        if not self._desktop_mode: return
        self._desktop_mode = False
        self.withdraw()
        self.overrideredirect(False)
        self.deiconify()
        self.attributes("-alpha", self._opacity)
        self.mode_lbl.config(text="", fg=T["TEXT_MUTED"])
        try:
            self.update_idletasks()
            hwnd = ctypes.windll.user32.GetParent(self.winfo_id())
            
            GWL_EXSTYLE = -20
            ex = ctypes.windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            ex &= ~0x00000080
            ex &= ~0x08000000
            ctypes.windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, ex)
        except Exception: pass

    def _toggle_mini(self):
        if self._mini_mode:
            # close mini, show main
            if self._mini_widget:
                self._mini_widget.destroy()
                self._mini_widget = None
            self._mini_mode = False
            self._prevent_minimize = True
            self.deiconify()
        else:
            # open mini, hide main
            self._prevent_minimize = False
            self._mini_mode = True
            self.withdraw()
            self._mini_widget = MiniWidget(self)

    def _maximize(self):
        if self._desktop_mode:
            sw = self.winfo_screenwidth()
            sh = self.winfo_screenheight()
            self.geometry(f"{sw}x{sh}+0+0")
        else:
            self.state("zoomed")

    def _set_opacity(self, alpha):
        self._opacity = alpha
        self.attributes("-alpha", alpha)

    def _start_drag(self, event):
        if self._desktop_mode:
            self._drag_data["x"] = event.x
            self._drag_data["y"] = event.y

    def _do_drag(self, event):
        if self._desktop_mode:
            x = self.winfo_x() + event.x - self._drag_data["x"]
            y = self.winfo_y() + event.y - self._drag_data["y"]
            self.geometry(f"+{x}+{y}")

    def _tray_show(self):
        """Toggle visibility from tray."""
        self._prevent_minimize = True
        if self._mini_mode:
            self._toggle_mini()
        elif self.state() == "withdrawn":
            self.deiconify()
        else:
            self.deiconify()
            self.lift()

    def _on_close(self):
        """Minimize to tray instead of closing (if tray available)."""
        if self._tray_icon:
            self._prevent_minimize = False
            self.withdraw()
        else:
            self._quit()

    def _tick_clock(self):
        self.clock_lbl.config(text=time.strftime("%H:%M:%S"))
        ups = time.time() - psutil.boot_time()
        self.up_lbl.config(text=f"Uptime: {fmt_uptime(ups)}  •  ")
        self.after(1000, self._tick_clock)

    # ──────────────────────────────────────────────────────────────────────────
    #  THREADS
    # ──────────────────────────────────────────────────────────────────────────
    def _start_threads(self):
        threading.Thread(target=self._loop_main,  daemon=True).start()
        threading.Thread(target=self._loop_gpu,   daemon=True).start()
        threading.Thread(target=self._loop_gpu3d, daemon=True).start()
        threading.Thread(target=self._detect_gpu, daemon=True).start()
        
        # Start DB and Web Server
        init_db()
        threading.Thread(target=self._loop_db, daemon=True).start()
        threading.Thread(target=start_web_server, daemon=True).start()

    def _detect_gpu(self):
        self._gpu_vendor = detect_gpu_vendor()
        name = get_gpu_name()
        self.after(0, lambda: self.gpu_name_lbl.config(text=f"GPU: {name}"))

    def _loop_gpu(self):
        while self._running:
            if self._gpu_vendor == "NVIDIA":
                u, mu, mt, t = get_nvidia_info()
                self._gpu_util = u; self._gpu_mem_u = mu
                self._gpu_mem_t = mt; self._gpu_temp = t
            time.sleep(2)

    def _loop_gpu3d(self):
        while self._running:
            self._gpu_3d = get_total_gpu_3d()
            time.sleep(2.5)

    def _loop_main(self):
        while self._running:
            try:
                cpu_t = psutil.cpu_percent(interval=1)
                cpu_c = psutil.cpu_percent(percpu=True)
                cpu_f = psutil.cpu_freq()
                ram   = psutil.virtual_memory()
                disk  = psutil.disk_usage("C:\\")

                dio = psutil.disk_io_counters()
                now = time.time()
                dt = now - self._last_dio_t or 1
                rd_kb = (dio.read_bytes  - self._last_dio.read_bytes)  / dt / 1024
                wr_kb = (dio.write_bytes - self._last_dio.write_bytes) / dt / 1024
                self._last_dio = dio; self._last_dio_t = now

                net = psutil.net_io_counters()
                dt2 = now - self._last_net_t or 1
                dl = (net.bytes_recv - self._last_net.bytes_recv) / dt2 / 1024
                ul = (net.bytes_sent - self._last_net.bytes_sent) / dt2 / 1024
                self._last_net = net; self._last_net_t = now

                bt = psutil.sensors_battery()
                bp  = int(bt.percent) if bt else 0
                bpl = bt.power_plugged if bt else False
                bav = bt is not None

                pc = len(psutil.pids())

                procs = []
                for p in psutil.process_iter(["pid","name","memory_info","status","num_threads","io_counters"]):
                    try:
                        i = p.info
                        m = i["memory_info"].rss / 1048576 if i.get("memory_info") else 0
                        c = p.cpu_percent(interval=None) / (psutil.cpu_count() or 1)
                        th = i.get("num_threads") or 0
                        
                        io = i.get("io_counters")
                        disk_io = (io.read_bytes + io.write_bytes) / 1048576 if io else 0.0
                            
                        procs.append((i["pid"], i["name"], c, m, disk_io, th, i.get("status","")))
                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                        pass

                sk = 3 if self.sort_var.get() == "RAM" else 2
                procs.sort(key=lambda x: x[sk], reverse=True)
                top = procs[:18]

                # Alerts
                self._alerts.check(cpu_t, ram.percent)

                self.after(0, self._update, cpu_t, cpu_c, cpu_f, ram, disk,
                           dl, ul, rd_kb, wr_kb,
                           self._gpu_util, self._gpu_mem_u, self._gpu_mem_t,
                           self._gpu_temp, self._gpu_3d,
                           bp, bpl, bav, pc, top)
            except Exception:
                time.sleep(1)

    # ──────────────────────────────────────────────────────────────────────────
    #  UPDATE UI
    # ──────────────────────────────────────────────────────────────────────────
    def _update(self, cpu_t, cpu_c, cpu_f, ram, disk,
                dl, ul, rd_kb, wr_kb,
                gu, gmu, gmt, gt, g3d,
                bp, bpl, bav, pc, top):

        freq = f"{cpu_f.current:.0f} MHz" if cpu_f else ""
        self.g_cpu.set(cpu_t, freq)
        rg = ram.used/(1024**3)
        self.g_ram.set(ram.percent, f"{rg:.1f}/{ram.total/(1024**3):.0f} GB")

        if gu > 0 or self._gpu_vendor == "NVIDIA":
            self.g_gpu.set(gu, f"{gmu} MB" if gmt else "")
        else:
            self.g_gpu.set(g3d, "via 3D Engine")

        self.g_3d.set(g3d)
        self.g_disk.set(disk.percent, f"{disk.free/(1024**3):.1f} GB free")

        self.bat.set(bp, bpl, bav)
        self.core_bars.set(cpu_c)

        self.graph_cpu.push(cpu_t, "CPU")
        self.graph_ram.push(ram.percent, "RAM")

        self.b_dl.set(fmt_speed(dl), color=T["ACCENT3"] if dl > 500 else T["TEXT"])
        self.b_ul.set(fmt_speed(ul))
        self.b_dr.set(fmt_speed(rd_kb))
        self.b_dw.set(fmt_speed(wr_kb))
        self.b_temp.set(f"{gt}°C" if gt else "—",
                        color=T["RED"] if gt and gt > 80 else T["TEXT"])
        self.b_vram.set(f"{gmu}/{gmt} MB" if gmt else "—")
        self.b_proc.set(str(pc))

        for item in self.tree.get_children():
            self.tree.delete(item)
        for i, (pid, name, cp, mem, disk_io, th, st) in enumerate(top):
            tag = "hot" if cp > 15 else ("odd" if i % 2 else "even")
            
            cp_str = f"{cp:.1f}% / 100%"
            ram_pct = (mem / self._ram_total_mb) * 100 if self._ram_total_mb else 0
            mem_str = f"{mem:.0f} MB / {self._ram_total_mb:.0f} MB ({ram_pct:.1f}%)"
            disk_str = f"{disk_io:.1f}" if disk_io > 0 else "0.0"
            
            self.tree.insert("","end",
                             values=(pid, name, cp_str, mem_str, disk_str, th),
                             tags=(tag,))

        # update mini widget
        if self._mini_mode and self._mini_widget:
            gpu_val = gu if (gu > 0 or self._gpu_vendor == "NVIDIA") else g3d
            self._mini_widget.update_values(cpu_t, ram.percent, gpu_val)

    def _quit(self):
        self._running = False
        if self._tray_icon:
            try:
                self._tray_icon.stop()
            except Exception:
                pass
        if self._mini_widget:
            try:
                self._mini_widget.destroy()
            except Exception:
                pass
        self.destroy()


# ═══════════════════════════════════════════════════════════════════════════════
#  DATABASE & WEB SERVER
# ═══════════════════════════════════════════════════════════════════════════════
import sqlite3

def init_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS history
                     (timestamp REAL, cpu REAL, ram REAL, gpu REAL)''')
        c.execute('DELETE FROM history WHERE timestamp < ?', (time.time() - 7*86400,))
        conn.commit()
        conn.close()
    except Exception: pass

def _loop_db(self):
    while self._running:
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            gpu_val = self._gpu_util if (self._gpu_util > 0 or self._gpu_vendor == "NVIDIA") else self._gpu_3d
            c.execute("INSERT INTO history VALUES (?, ?, ?, ?)",
                      (time.time(), getattr(self.g_cpu, '_tgt', 0), getattr(self.g_ram, '_tgt', 0), gpu_val))
            conn.commit()
            conn.close()
        except Exception: pass
        time.sleep(10)
App._loop_db = _loop_db

def start_web_server():
    try:
        from flask import Flask, jsonify
        import logging
        log = logging.getLogger('werkzeug')
        log.setLevel(logging.ERROR)
        
        flask_app = Flask(__name__)

        @flask_app.route('/')
        def index():
            return """<!DOCTYPE html><html><head><title>System Monitor Dashboard</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
            body { background: #080c14; color: #00d4ff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; }
            .card { background: #0e1525; border: 1px solid #172038; border-radius: 8px; padding: 20px; margin-bottom: 20px; max-width: 500px; margin-left: auto; margin-right: auto;}
            h2 { color: #fff; margin-top: 0; text-align: center;}
            .stat { display: flex; justify-content: space-between; font-size: 1.2rem; margin: 15px 0; border-bottom: 1px solid #172038; padding-bottom: 5px;}
            .val { font-weight: bold; }
            </style></head>
            <body>
            <div class="card">
                <h2>◈ System Monitor Pro</h2>
                <div class="stat"><span>CPU</span> <span class="val" id="cpu">...</span></div>
                <div class="stat"><span>RAM</span> <span class="val" id="ram" style="color: #a855f7">...</span></div>
                <div class="stat"><span>GPU</span> <span class="val" id="gpu" style="color: #22c55e">...</span></div>
                <p style="text-align:center; color:#64748b; font-size:0.8rem; margin-top:30px;">Live Data (Updated every 2s)</p>
            </div>
            <script>
            setInterval(() => {
                fetch('/api/current').then(r=>r.json()).then(d => {
                    document.getElementById('cpu').innerText = d.cpu.toFixed(0) + '%';
                    document.getElementById('ram').innerText = d.ram.toFixed(0) + '%';
                    document.getElementById('gpu').innerText = d.gpu.toFixed(0) + '%';
                }).catch(e=>console.log(e));
            }, 2000);
            </script>
            </body></html>"""

        @flask_app.route('/api/current')
        def current():
            try:
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                c.execute("SELECT cpu, ram, gpu FROM history ORDER BY timestamp DESC LIMIT 1")
                row = c.fetchone()
                conn.close()
                if row: return jsonify({"cpu": row[0], "ram": row[1], "gpu": row[2]})
            except Exception: pass
            return jsonify({"cpu": 0, "ram": 0, "gpu": 0})

        flask_app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
    except Exception as e:
        print("Web server failed:", e)

# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    App().mainloop()
