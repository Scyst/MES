import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Camera, QrCode, Search, Barcode, ArrowRight, RefreshCw,
  FlipHorizontal, AlertTriangle, Zap, ZapOff
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const SCANNER_CONTAINER_ID = 'interactive-camera-scanner-view';

export default function QuickScannerModal({ isOpen, onClose, onSearch }) {
  const [activeMode, setActiveMode] = useState('camera'); // 'camera' | 'manual'
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const scannerRef = useRef(null);

  // Play audio feedback beep
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // ignore audio errors
    }
  };

  // Safely stop camera
  const stopCamera = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState?.();
        if (state === 2) { // 2 = SCANNING
          await scannerRef.current.stop();
        }
        try {
          scannerRef.current.clear?.();
        } catch (e) {}
      }
    } catch (err) {
      console.warn('[Camera] Stop error:', err);
    } finally {
      setIsScanning(false);
      setIsTorchOn(false);
    }
  };

  // Start camera scanner
  const startCamera = async (cameraIdToUse = null) => {
    setCameraError(null);
    const element = document.getElementById(SCANNER_CONTAINER_ID);
    if (!element) return;

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(SCANNER_CONTAINER_ID);
      } else {
        const state = scannerRef.current.getState?.();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      }

      // Enumerate cameras if not already available
      let cameraList = cameras;
      if (cameraList.length === 0) {
        try {
          cameraList = await Html5Qrcode.getCameras();
          setCameras(cameraList || []);
        } catch (e) {
          console.warn('[Camera] Failed to enumerate devices, will use facingMode:', e);
        }
      }

      // Choose environment/back camera by default on phones
      let cameraTarget = { facingMode: 'environment' };
      if (cameraIdToUse) {
        cameraTarget = cameraIdToUse;
      } else if (cameraList && cameraList.length > 0) {
        const backCam = cameraList.find(c => /back|rear|environment/i.test(c.label)) || cameraList[cameraList.length - 1];
        cameraTarget = backCam.id;
      }

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.max(180, Math.floor(minEdge * 0.72));
          return { width: edge, height: edge };
        },
        aspectRatio: 1.0,
      };

      await scannerRef.current.start(
        cameraTarget,
        config,
        (decodedText) => {
          playBeep();
          if (navigator.vibrate) {
            try { navigator.vibrate(120); } catch (e) {}
          }
          stopCamera();
          onSearch(decodedText.trim());
          onClose();
        },
        () => {
          // Frame failure (harmless in continuous scan)
        }
      );

      setIsScanning(true);
      if (typeof cameraTarget === 'string') {
        setSelectedCameraId(cameraTarget);
      }

      // Check flashlight/torch capability
      try {
        const caps = scannerRef.current.getRunningTrackCapabilities?.();
        if (caps && 'torch' in caps) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch (e) {
        setHasTorch(false);
      }
    } catch (err) {
      console.error('[Camera] Failed to start Html5Qrcode:', err);
      let errMsg = 'ไม่สามารถเปิดกล้องได้';
      const msg = err.message || '';
      if (err.name === 'NotAllowedError' || /permission/i.test(msg)) {
        errMsg = 'เบราว์เซอร์ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาเปิด Camera Permission ในการตั้งค่า';
      } else if (err.name === 'NotFoundError' || /device not found/i.test(msg)) {
        errMsg = 'ไม่พบอุปกรณ์กล้องบนเครื่องนี้';
      } else if (msg) {
        errMsg = `ข้อผิดพลาด: ${msg}`;
      }
      setCameraError(errMsg);
      setIsScanning(false);
    }
  };

  // Switch camera (front / back)
  const handleToggleCamera = async () => {
    if (cameras.length <= 1) return;
    const currIdx = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIdx = (currIdx + 1) % cameras.length;
    const nextCam = cameras[nextIdx];
    setSelectedCameraId(nextCam.id);
    await startCamera(nextCam.id);
  };

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    try {
      if (scannerRef.current && scannerRef.current.getState?.() === 2) {
        const nextState = !isTorchOn;
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: nextState }]
        });
        setIsTorchOn(nextState);
      }
    } catch (err) {
      console.warn('[Camera] Failed to toggle torch:', err);
    }
  };

  // Handle modal open/close lifecycle
  useEffect(() => {
    if (isOpen && activeMode === 'camera') {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isOpen) return null;

  const handleModalClose = async () => {
    await stopCamera();
    onClose();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    stopCamera();
    onSearch(barcodeInput.trim());
    setBarcodeInput('');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-600 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <div>
              <h3 className="text-xs sm:text-sm font-black tracking-wide leading-tight">
                สแกนเนอร์บาร์โค้ด & QR Code
              </h3>
              <p className="text-[10px] text-blue-100 leading-tight">
                กล้องมือถือ (Live Camera) • Barcode Gun
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-1 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveMode('camera')}
            className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'camera'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>กล้องมือถือ (Live)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('manual');
              stopCamera();
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'manual'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>พิมพ์เอง / ปืนยิง</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-3 flex-1">
          {activeMode === 'camera' ? (
            <div className="space-y-3">
              {/* Camera Video Viewport */}
              <div className="w-full bg-slate-950 rounded-xl overflow-hidden relative shadow-inner aspect-square max-h-[300px] flex items-center justify-center border border-slate-800">
                {/* HTML5-QRCode Viewport */}
                <div
                  id={SCANNER_CONTAINER_ID}
                  className="w-full h-full flex items-center justify-center overflow-hidden"
                />

                {/* Loading / Spinner State */}
                {!isScanning && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-300 p-4 text-center">
                    <RefreshCw className="w-7 h-7 text-blue-500 animate-spin mb-2" />
                    <p className="text-xs font-semibold">กำลังเชื่อมต่อกล้องมือถือ...</p>
                    <p className="text-[10px] text-slate-500 mt-1">กรุณากด 'อนุญาต' (Allow) หากระบบถามหาการเข้าถึงกล้อง</p>
                  </div>
                )}

                {/* Error Banner */}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-slate-200 p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-red-400 max-w-xs">{cameraError}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera(selectedCameraId)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>ลองใหม่</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMode('manual');
                          stopCamera();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold cursor-pointer"
                      >
                        พิมพ์ Part No เอง
                      </button>
                    </div>
                  </div>
                )}

                {/* Laser Scanning Reticle Frame */}
                {isScanning && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-blue-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      {/* Reticle Corners */}
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-blue-500 rounded-tl" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-blue-500 rounded-tr" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-blue-500 rounded-bl" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-blue-500 rounded-br" />
                      {/* Scanning Line Animation */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_8px_#ef4444]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Action Buttons (Switch Camera & Flashlight) */}
              {isScanning && (
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5">
                    {cameras.length > 1 && (
                      <button
                        type="button"
                        onClick={handleToggleCamera}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span>สลับกล้อง</span>
                      </button>
                    )}

                    {hasTorch && (
                      <button
                        type="button"
                        onClick={handleToggleTorch}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                          isTorchOn
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {isTorchOn ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                        <span>{isTorchOn ? 'ปิดไฟ' : 'เปิดไฟ'}</span>
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium truncate">
                    เล็งบาร์โค้ดให้อยู่ในกรอบ
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-2 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2.5 shadow-inner">
                <Barcode className="w-7 h-7" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 mb-0.5">
                พิมพ์ Part No หรือยิงด้วย Barcode Gun
              </h4>
              <p className="text-[11px] text-slate-400">
                รองรับเครื่องยิงบาร์โค้ดไร้สาย Bluetooth และ USB
              </p>
            </div>
          )}

          {/* Fallback Quick Search Input Bar (Always accessible) */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="พิมพ์ Part No หรือยิงโค้ด..."
                className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={!barcodeInput.trim()}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation min-h-[40px]"
            >
              <span>ค้นหาในสต็อกทันที</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
