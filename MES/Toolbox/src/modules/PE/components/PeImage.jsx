import React, { useEffect, useMemo, useState } from 'react';
import { ImageOff, X } from 'lucide-react';
import { getPeImageCandidates } from '../../../shared/utils/mediaUrl';

/**
 * Displays authenticated PE Maintenance images (work orders, machines, spare parts)
 * with multi-candidate fallback across API and legacy upload paths plus lightbox preview.
 */
export default function PeImage({ path, alt = 'PE Image', className = 'w-12 h-12 rounded-lg object-cover', clickable = true }) {
  const candidates = useMemo(() => getPeImageCandidates(path), [path]);
  const [candidateIdx, setCandidateIdx] = useState(0);
  const [openLightbox, setOpenLightbox] = useState(false);

  useEffect(() => {
    setCandidateIdx(0);
  }, [path]);

  const src = candidateIdx < candidates.length ? candidates[candidateIdx] : '';

  if (!src) {
    return (
      <div className={`inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0 ${className}`}>
        <ImageOff className="w-4 h-4" />
      </div>
    );
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setCandidateIdx((prev) => prev + 1)}
        onClick={clickable ? () => setOpenLightbox(true) : undefined}
        className={`${className} ${clickable ? 'cursor-zoom-in hover:opacity-90 transition-opacity' : ''}`}
      />
      {openLightbox && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpenLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpenLightbox(false)}
              className="absolute -top-3 -right-3 w-11 h-11 rounded-full bg-white text-slate-900 shadow-lg flex items-center justify-center hover:bg-slate-100"
              aria-label="ปิดหน้าต่างรูปภาพ"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={src} alt={alt} className="max-h-[82vh] max-w-full rounded-xl shadow-2xl object-contain bg-black" />
            <div className="mt-2 text-xs text-slate-300 font-medium">{alt}</div>
          </div>
        </div>
      )}
    </>
  );
}
