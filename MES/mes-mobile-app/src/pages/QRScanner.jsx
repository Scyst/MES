import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { QrCode, X } from 'lucide-react';

export default function QRScanner() {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(null);
  const [hasCamera, setHasCamera] = useState(true);
  const scannerRef = useRef(null);

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
          (decodedText) => {
            setScanResult(decodedText);
            html5QrCode.stop().catch(console.error);
            
            setTimeout(() => {
              navigate(`/machine/${decodedText}`);
            }, 1500);
          },
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

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold flex items-center justify-center">
          <QrCode className="mr-2 text-blue-400" />
          Scan QR Code
        </h2>
        <p className="text-gray-400 mt-2 text-sm">Point your camera at a Machine ID or Employee Badge</p>
      </div>

      <div className="w-full max-w-sm bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 min-h-[300px] flex items-center justify-center">
        {!hasCamera && !scanResult && (
          <p className="text-gray-500 p-4 text-center">Camera not found or permission denied.</p>
        )}
        
        {!scanResult ? (
          <div id="qr-reader" className="w-full"></div>
        ) : (
          <div className="p-8 text-center bg-green-900/20 w-full h-full flex flex-col justify-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
              <span className="text-2xl">✓</span>
            </div>
            <h3 className="text-xl font-bold text-green-400 mb-2">Scan Successful!</h3>
            <p className="text-gray-300 font-mono text-lg bg-gray-950 py-2 rounded-lg">{scanResult}</p>
            <p className="text-gray-500 text-sm mt-4">Redirecting...</p>
          </div>
        )}
      </div>

      <button 
        onClick={() => navigate(-1)}
        className="mt-8 flex items-center justify-center px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-colors"
      >
        <X className="mr-2" size={20} />
        Cancel Scanning
      </button>
    </div>
  );
}

