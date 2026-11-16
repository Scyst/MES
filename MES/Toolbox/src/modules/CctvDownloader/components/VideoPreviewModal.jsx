import React from 'react';
import { Download, X } from 'lucide-react';
import { cctvApi } from '../../../shared/services/cctvApi';

/**
 * In-browser MP4 preview modal backed by range-capable stream endpoint.
 */
export default function VideoPreviewModal({ filename, onClose }) {
  if (!filename) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="font-mono text-xs sm:text-sm font-bold truncate">{filename}</div>
          <div className="flex items-center gap-2">
            <a
              href={cctvApi.getStreamUrl(filename, true)}
              download={filename}
              className="min-h-[40px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold flex items-center gap-1.5"
            >
              <Download size={14} /> <span>ดาวน์โหลด</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-slate-800"
              aria-label="ปิดวิดีโอ"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="bg-black p-3 flex items-center justify-center">
          <video
            src={cctvApi.getStreamUrl(filename, false)}
            controls
            autoPlay
            preload="metadata"
            className="w-full max-h-[75vh] rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
