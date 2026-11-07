import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Sun, Moon, Eye, Play, Pause, Maximize2, AlertTriangle, Download, Compass } from 'lucide-react';

export default function ThreeDViewer({ docUrl, fileName, isDarkTheme = false }) {
  const containerRef = useRef(null);
  const viewerInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [isXRay, setIsXRay] = useState(false);
  const [isDarkBg, setIsDarkBg] = useState(isDarkTheme);

  useEffect(() => {
    let isMounted = true;
    let pollInterval = null;

    // Load Online 3D Viewer script dynamically if not present
    const loadScript = () => {
      return new Promise((resolve, reject) => {
        if (window.OV) {
          resolve(window.OV);
          return;
        }
        const existingScript = document.getElementById('o3dv-script');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve(window.OV));
          existingScript.addEventListener('error', reject);
          return;
        }
        const script = document.createElement('script');
        script.id = 'o3dv-script';
        script.src = 'https://cdn.jsdelivr.net/npm/online-3d-viewer@0.14.0/build/engine/o3dv.min.js';
        script.async = true;
        script.onload = () => resolve(window.OV);
        script.onerror = () => reject(new Error('ไม่สามารถโหลดไลบรารี Online 3D Viewer ได้'));
        document.head.appendChild(script);
      });
    };

    const initViewer = async () => {
      try {
        setLoading(true);
        setError(null);
        setDimensions(null);

        const OV = await loadScript();
        if (!isMounted || !containerRef.current) return;

        // Clean up previous viewer if exists
        if (viewerInstanceRef.current) {
          containerRef.current.innerHTML = '';
          viewerInstanceRef.current = null;
        }

        OV.SetExternalLibLocation('https://cdn.jsdelivr.net/npm/online-3d-viewer@0.14.0/libs');
        OV.Init3DViewerElements();

        const bgCol = isDarkBg 
          ? new OV.RGBAColor(15, 23, 42, 255) 
          : new OV.RGBAColor(248, 250, 252, 255);

        const viewer = new OV.EmbeddedViewer(containerRef.current, {
          backgroundColor: bgCol,
          defaultColor: new OV.RGBColor(200, 200, 200),
          edgeSettings: new OV.EdgeSettings(true, new OV.RGBColor(50, 50, 50), 1)
        });

        viewerInstanceRef.current = viewer;

        // Fetch model file blob
        const response = await fetch(docUrl);
        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}: ไม่สามารถดาวน์โหลดไฟล์โมเดลจากเซิร์ฟเวอร์`);
        }
        const blob = await response.blob();
        if (!isMounted) return;

        const file = new File([blob], fileName || 'model.step');
        viewer.LoadModelFromFileList([file]);

        // Poll for model dimensions
        pollInterval = setInterval(() => {
          if (!viewerInstanceRef.current) {
            clearInterval(pollInterval);
            return;
          }
          const v = viewerInstanceRef.current.GetViewer();
          if (v && typeof v.GetBoundingBox === 'function') {
            const bb = v.GetBoundingBox(() => true);
            if (bb && bb.min && bb.max) {
              const x = (bb.max.x - bb.min.x).toFixed(2);
              const y = (bb.max.y - bb.min.y).toFixed(2);
              const z = (bb.max.z - bb.min.z).toFixed(2);
              if (parseFloat(x) > 0 || parseFloat(y) > 0 || parseFloat(z) > 0) {
                setDimensions({ x, y, z });
                setLoading(false);
                clearInterval(pollInterval);
              }
            }
          }
        }, 800);

        // Timeout fallback for loading indicator
        setTimeout(() => {
          if (isMounted) setLoading(false);
        }, 6000);

      } catch (err) {
        console.error('3D Viewer Initialization Error:', err);
        if (isMounted) {
          setError(err.message || 'เกิดข้อผิดพลาดในการเรนเดอร์โมเดล 3D');
          setLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (viewerInstanceRef.current && containerRef.current) {
        containerRef.current.innerHTML = '';
        viewerInstanceRef.current = null;
      }
    };
  }, [docUrl, fileName]);

  // Controls Handlers
  const handleToggleAutoRotate = () => {
    if (!viewerInstanceRef.current) return;
    const v = viewerInstanceRef.current.GetViewer();
    if (!v) return;
    const nextState = !isAutoRotate;
    if (typeof v.SetAutoRotate === 'function') {
      v.SetAutoRotate(nextState);
    }
    setIsAutoRotate(nextState);
  };

  const handleToggleTheme = () => {
    if (!viewerInstanceRef.current || !window.OV) return;
    const nextDark = !isDarkBg;
    const bgCol = nextDark 
      ? new window.OV.RGBAColor(15, 23, 42, 255) 
      : new window.OV.RGBAColor(248, 250, 252, 255);
    viewerInstanceRef.current.SetBackgroundColor(bgCol);
    setIsDarkBg(nextDark);
  };

  const handleToggleXRay = () => {
    if (!viewerInstanceRef.current) return;
    const v = viewerInstanceRef.current.GetViewer();
    if (!v) return;
    const nextXRay = !isXRay;
    const model = viewerInstanceRef.current.GetModel ? viewerInstanceRef.current.GetModel() : null;
    if (model && model.EnumerateMeshes) {
      model.EnumerateMeshes((mesh) => {
        if (mesh && mesh.material) {
          mesh.material.opacity = nextXRay ? 0.35 : 1.0;
          mesh.material.transparent = nextXRay;
        }
      });
      v.Render();
    }
    setIsXRay(nextXRay);
  };

  const handleResetCamera = () => {
    if (!viewerInstanceRef.current) return;
    const v = viewerInstanceRef.current.GetViewer();
    if (v && typeof v.FitModelToWindow === 'function') {
      v.FitModelToWindow();
    }
  };

  const handleTakeScreenshot = () => {
    if (!viewerInstanceRef.current) return;
    const v = viewerInstanceRef.current.GetViewer();
    if (!v) return;
    const canvas = containerRef.current ? containerRef.current.querySelector('canvas') : null;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${fileName || 'cad_model'}_screenshot.png`;
      a.click();
    }
  };

  return (
    <div className={`relative w-full h-full overflow-hidden flex flex-col ${isDarkBg ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* 3D WebGL Canvas Container */}
      <div 
        ref={containerRef} 
        className="w-full h-full flex-1 relative cursor-grab active:cursor-grabbing"
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xs text-white">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin mb-3"></div>
          <p className="text-sm font-semibold tracking-wide text-cyan-200">กำลังดาวน์โหลดและประมวลผล 3D CAD...</p>
          <span className="text-xs text-slate-400 mt-1">{fileName}</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-900/90 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/30">
            <AlertTriangle size={32} />
          </div>
          <h4 className="text-base font-bold text-slate-100 mb-2">ไม่สามารถแสดงผลแบบ 3 มิติได้โดยตรง</h4>
          <p className="text-xs text-slate-400 max-w-md mb-5 leading-relaxed">{error}</p>
          <div className="flex gap-3">
            <a
              href={docUrl}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-all"
            >
              <Download size={14} />
              <span>ดาวน์โหลดไฟล์ไปเปิดใน SolidWorks/CAD</span>
            </a>
          </div>
        </div>
      )}

      {/* Floating Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 p-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-xl">
        <button
          type="button"
          onClick={handleTakeScreenshot}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="ถ่ายภาพหน้าจอ (Screenshot PNG)"
        >
          <Camera size={16} />
        </button>

        <button
          type="button"
          onClick={handleToggleTheme}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="สลับพื้นหลัง ขาว / ดำ"
        >
          {isDarkBg ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          type="button"
          onClick={handleToggleXRay}
          className={`p-2 rounded-lg transition-colors ${isXRay ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
          title="โหมดโปร่งใส / เอ็กซเรย์ (X-Ray)"
        >
          <Eye size={16} />
        </button>

        <button
          type="button"
          onClick={handleToggleAutoRotate}
          className={`p-2 rounded-lg transition-colors ${isAutoRotate ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
          title="หมุนโมเดลอัตโนมัติ (Auto Rotate)"
        >
          {isAutoRotate ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          type="button"
          onClick={handleResetCamera}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="รีเซ็ตมุมมอง (Fit to Window)"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Dimensions Overlay (Bottom Right) */}
      {dimensions && (
        <div className="absolute bottom-4 right-4 z-10 px-3.5 py-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/70 rounded-xl shadow-lg text-[11px] font-mono text-slate-200 pointer-events-none flex items-center gap-2">
          <Compass size={14} className="text-cyan-400" />
          <span>Size:</span>
          <span className="text-rose-400 font-bold" title="Width X">X: {dimensions.x}</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-bold" title="Height Y">Y: {dimensions.y}</span>
          <span className="text-slate-600">|</span>
          <span className="text-sky-400 font-bold" title="Depth Z">Z: {dimensions.z}</span>
          <span className="text-slate-400 font-sans">mm</span>
        </div>
      )}

      {/* Mouse Interaction Helper (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none hidden md:block">
        <div className="px-3 py-2 bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-xl text-[10px] text-slate-400 font-medium space-y-0.5">
          <div><span className="text-slate-200 font-bold">คลิกซ้ายลาก</span> = หมุนมุมมอง (Rotate)</div>
          <div><span className="text-slate-200 font-bold">คลิกขวาลาก</span> = เลื่อนพิกัด (Pan)</div>
          <div><span className="text-slate-200 font-bold">ลูกกลิ้งเมาส์</span> = ซูมเข้า-ออก (Zoom)</div>
        </div>
      </div>
    </div>
  );
}
