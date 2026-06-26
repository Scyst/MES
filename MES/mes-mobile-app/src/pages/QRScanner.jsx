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
    <div className="flex flex-col items-center justify-center h-full pb-20">
      <div className="mb-4 text-center mt-6">
        <h2 className="text-2xl font-bold flex items-center justify-center text-gray-900 dark:text-white transition-colors">
          <QrCode className="mr-2 text-blue-600 dark:text-blue-400" />
          Scan QR Code
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm transition-colors">Machine ID, Employee Badge, or Transfer ID</p>
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 min-h-[300px] flex items-center justify-center transition-colors duration-300 relative">
        {!hasCamera && !scanResult && (
          <p className="text-gray-500 p-4 text-center absolute top-10">Camera not found or permission denied.</p>
        )}
        
        {!scanResult ? (
          <div id="qr-reader" className="w-full h-full"></div>
        ) : (
          <div className="p-8 text-center bg-green-50 dark:bg-green-900/20 w-full h-full flex flex-col justify-center transition-colors">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
              <span className="text-2xl text-white">✓</span>
            </div>
            <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">Success!</h3>
            <p className="text-gray-800 dark:text-gray-300 font-mono text-lg bg-gray-100 dark:bg-gray-950 py-2 rounded-lg transition-colors">{scanResult}</p>
            <p className="text-gray-500 text-sm mt-4">Redirecting...</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm mt-6 space-y-4 px-4">
        <label className="flex items-center justify-center w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
          <ImageIcon className="mr-2 h-5 w-5 text-gray-400" />
          Upload Image from Gallery
          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
        </label>
        
        <div className="relative flex items-center">
          <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OR</span>
          <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        <form onSubmit={handleManualSubmit} className="flex space-x-2">
          <input 
            type="text" 
            placeholder="Manual Entry (T-XXXXX)"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-4 py-3 shadow-md transition-colors flex items-center justify-center">
            <Search size={20} />
          </button>
        </form>
      </div>

      <button 
        onClick={() => navigate(-1)}
        className="mt-6 flex items-center justify-center px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors mb-6"
      >
        <X className="mr-2" size={20} />
        Cancel Scanning
      </button>
    </div>
  );
}

