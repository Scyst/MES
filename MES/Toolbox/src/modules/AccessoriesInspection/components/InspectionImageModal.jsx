import React, { useEffect, useState } from 'react';
import { ImageOff, X } from 'lucide-react';
import { accessoriesApi } from '../../../shared/services/accessoriesApi';

/**
 * Full-resolution inspection image preview modal with automatic fallback chain.
 */
export default function InspectionImageModal({ imageName, onClose }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  const candidates = imageName ? accessoriesApi.getImageCandidates(imageName) : [];

  useEffect(() => {
    setCandidateIndex(0);
    setAllFailed(false);
  }, [imageName]);

  if (!imageName) return null;

  const currentSrc = candidates[candidateIndex] || '';

  const handleImgError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setAllFailed(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="font-mono text-xs sm:text-sm font-semibold truncate">{imageName}</div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-800"
            aria-label="ปิดรูปภาพ"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 flex items-center justify-center min-h-[300px] bg-black">
          {allFailed || !currentSrc ? (
            <div className="text-center text-slate-400 space-y-2 py-10">
              <ImageOff size={40} className="mx-auto" />
              <div className="text-sm font-semibold">ไม่พบไฟล์รูปภาพบนเซิร์ฟเวอร์</div>
              <div className="text-xs text-slate-500">({imageName})</div>
            </div>
          ) : (
            <img
              src={currentSrc}
              alt={imageName}
              onError={handleImgError}
              className="max-h-[75vh] w-auto object-contain rounded-lg"
            />
          )}
        </div>
      </div>
    </div>
  );
}
