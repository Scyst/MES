import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { QrCode, X, Image as ImageIcon, Search } from 'lucide-react';

export default function QRScanner() {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [manualId, setManualId] = useState('');
  const scannerRef = useRef(null);

  const handleScanSuccess = (decodedText) => {
    setScanResult(decodedText);
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(console.error);
    }
    
    setTimeout(() => {
      // If it starts with T- it's likely a Transfer ID for Receipt
      if (decodedText.startsWith('T-')) {
        navigate(`/receipt/${decodedText}`);
      } else {
        navigate(`/machine/${decodedText}`);
      }
    }, 1500);
  };

  useEffect(() => {
    let html5QrCode;
    let isMounted = true;

    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length && isMounted) {
        html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;
        
        html5QrCode.start(
          { facingMode: "environment" }, 
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          handleScanSuccess,
          (errorMessage) => {
            // ignore continuous scanning errors
          }
        ).catch(err => {
          console.error(err);
          if (isMounted) setHasCamera(false);
        });
      } else {
        if (isMounted) setHasCamera(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) setHasCamera(false);
    });

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          const tryClear = () => {
            try { scannerRef.current.clear(); } catch (e) { /* ignore */ }
          };
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop()
              .then(tryClear)
              .catch(err => console.error("Cleanup stop error", err));
          } else {
            tryClear();
          }
        } catch (err) {
          console.error("Cleanup error", err);
        }
      }
    };
  }, [navigate]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (scannerRef.current) {
      scannerRef.current.scanFile(file, true)
        .then(decodedText => {
          handleScanSuccess(decodedText);
        })
        .catch(err => {
          alert(`Error scanning image: ${err}`);
        });
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualId.trim()) {
      handleScanSuccess(manualId.trim());
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-6 pt-2 px-4 max-w-md mx-auto space-y-6">
      
      {/* Premium Header */}
      <div className="flex items-center space-x-3 w-full bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl shadow-inner">
          <QrCode size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">สแกนคิวอาร์โค้ด</h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">สแกนรหัสเครื่องจักร, พนักงาน หรือเอกสาร</p>
        </div>
      </div>

      {/* Camera Box */}
      <div className="w-full bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-50 dark:border-gray-800 aspect-square flex items-center justify-center transition-all duration-300 relative [&>div>video]:object-cover [&>div>video]:w-full [&>div>video]:h-full">
        {!hasCamera && !scanResult && (
          <p className="text-gray-400 p-4 text-center absolute top-10 z-10 text-sm bg-black/50 rounded-xl mx-4">ไม่พบกล้อง หรือ ไม่ได้รับอนุญาตให้เข้าถึงกล้อง</p>
        )}
        
        {!scanResult ? (
          <div id="qr-reader" className="w-full h-full"></div>
        ) : (
          <div className="p-8 text-center bg-green-50 dark:bg-green-900/20 w-full h-full flex flex-col justify-center absolute inset-0 z-20 backdrop-blur-sm transition-colors">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
              <span className="text-2xl text-white">✓</span>
            </div>
            <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">สำเร็จ!</h3>
            <p className="text-gray-800 dark:text-gray-300 font-mono text-lg bg-white/80 dark:bg-black/50 py-2 px-4 rounded-xl shadow-sm transition-colors">{scanResult}</p>
            <p className="text-gray-500 text-sm mt-4">กำลังเปลี่ยนหน้า...</p>
          </div>
        )}
      </div>

      {/* Modern Actions Container */}
      <div className="w-full bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-xl border border-gray-100 dark:border-gray-800 space-y-5 relative overflow-hidden transition-colors">
        {/* subtle background glow */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-50 dark:bg-blue-900/20 blur-2xl pointer-events-none transition-colors"></div>
        
        <label className="relative flex items-center justify-center w-full px-4 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-100 dark:border-blue-800/50 rounded-2xl text-sm font-bold text-blue-700 dark:text-blue-300 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]">
          <ImageIcon className="mr-2 h-5 w-5" />
          อัพโหลดรูปภาพจากแกลลอรี่
          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
        </label>
        
        <div className="relative flex items-center">
          <div className="flex-grow border-t border-gray-100 dark:border-gray-800 transition-colors"></div>
          <span className="flex-shrink-0 mx-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest transition-colors">หรือกรอกรหัส</span>
          <div className="flex-grow border-t border-gray-100 dark:border-gray-800 transition-colors"></div>
        </div>

        <form onSubmit={handleManualSubmit} className="relative flex items-center group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-gray-400">
            <Search className="h-5 w-5" />
          </div>
          <input 
            type="text" 
            placeholder="พิมพ์รหัส (เช่น T-XXXXX)"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl pl-11 pr-24 py-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
          />
          <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 shadow-sm transition-transform active:scale-95 flex items-center justify-center font-semibold text-xs">
             ค้นหา
          </button>
        </form>
      </div>

    </div>
  );
}

