import React, { useState, useEffect } from 'react';
import { FiMaximize2, FiX, FiZoomIn, FiZoomOut, FiInfo, FiCheckCircle, FiAlertTriangle, FiLayers, FiCamera } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

/**
 * High-Resolution Industrial Inspection Lightbox Modal
 */
export function IndustrialPhotoLightbox({ isOpen, onClose, photo }) {
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !photo) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md transition-all animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl w-full max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <FiCamera className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-white">{photo.title}</h3>
              <p className="text-[11px] text-slate-400">{photo.subtitle || 'Industrial Quality Inspection Photography'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
              <button 
                onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.5))}
                disabled={zoomLevel <= 1}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                title="Zoom Out"
              >
                <FiZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-2 text-slate-300 font-bold">{zoomLevel.toFixed(1)}x</span>
              <button 
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.5))}
                disabled={zoomLevel >= 3}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                title="Zoom In"
              >
                <FiZoomIn className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
              title="Close (Esc)"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable / Zoomable Image Canvas */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/50 min-h-[300px]">
          <div 
            className="transition-transform duration-200 ease-out origin-center flex items-center justify-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img 
              src={photo.src} 
              alt={photo.title}
              className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
              onError={(e) => {
                if (photo.fallbackSrc && !e.target.dataset.fallbackTried) {
                  e.target.dataset.fallbackTried = 'true';
                  e.target.src = photo.fallbackSrc;
                }
              }}
            />
          </div>
        </div>

        {/* Bottom Technical Specs Bar */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-3">
          {photo.specs && photo.specs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {photo.specs.map((spec, i) => (
                <div key={i} className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">{spec.label}</span>
                  <span className="text-xs font-bold text-cyan-300 font-mono">{spec.value}</span>
                </div>
              ))}
            </div>
          )}
          {photo.description && (
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
              <strong className="text-cyan-400">จุดสังเกตเชิงวิศวกรรม:</strong> {photo.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Card Component Displaying an Industrial Photo alongside Tech Specs
 */
export function IndustrialPhotoCard({ 
  src, 
  fallbackSrc,
  title, 
  subtitle, 
  badge = 'ภาพถ่ายอุปกรณ์จริง (Real Equipment)', 
  badgeColor = 'cyan',
  specs = [], 
  description,
  checkpoints = [] 
}) {
  const { isDark } = useTheme();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const badgeColorClasses = {
    cyan: isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200',
    emerald: isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
    rose: isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200',
    indigo: isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }[badgeColor] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';

  const photoData = { src, fallbackSrc, title, subtitle, specs, description };

  return (
    <>
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-4 ${
        isDark ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
      }`}>
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-md border ${badgeColorClasses}`}>
              {badge}
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</span>
          </div>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
            <FiMaximize2 className="w-3 h-3" /> คลิกภาพเพื่อขยายพิกเซล
          </span>
        </div>

        {/* Image Display Area with Hover Overlay */}
        <div 
          onClick={() => setIsLightboxOpen(true)}
          className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center cursor-pointer max-h-72 transition-all hover:border-cyan-500/50"
        >
          <img 
            src={src} 
            alt={title}
            className="w-full max-h-72 object-contain group-hover:scale-102 transition-transform duration-300"
            onError={(e) => {
              if (fallbackSrc && !e.target.dataset.fallbackTried) {
                e.target.dataset.fallbackTried = 'true';
                e.target.src = fallbackSrc;
              }
            }}
          />
          {/* Hover Zoom Overlay */}
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold backdrop-blur-xs">
            <span className="p-2 rounded-full bg-cyan-600/80 border border-cyan-400 flex items-center gap-1.5 shadow-lg">
              <FiZoomIn className="w-4 h-4" /> ดูภาพขยายความละเอียดสูง
            </span>
          </div>
        </div>

        {/* Specs Grid */}
        {specs && specs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {specs.map((s, idx) => (
              <div key={idx} className={`p-2 rounded-lg border ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-[10px] text-slate-400 uppercase font-mono">{s.label}</div>
                <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono mt-0.5 truncate">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Description & Engineering Checkpoints */}
        {description && (
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {description}
          </p>
        )}

        {checkpoints && checkpoints.length > 0 && (
          <div className={`p-3 rounded-xl border space-y-1.5 ${
            isDark ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="font-bold text-xs flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
              <FiCheckCircle className="w-3.5 h-3.5" /> เกณฑ์การตรวจสอบหน้างานจริง (Quality Standard):
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pl-1">
              {checkpoints.map((cp, idx) => (
                <li key={idx} className="leading-relaxed">{cp}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <IndustrialPhotoLightbox 
        isOpen={isLightboxOpen} 
        onClose={() => setIsLightboxOpen(false)} 
        photo={photoData}
      />
    </>
  );
}

/**
 * Side-by-side or Tabbed Comparison Component for Real Industrial Photos
 * (e.g. OK vs NG Defect, Standard Lens vs Telecentric, Raw vs Anomaly Heatmap)
 */
export function PhotoComparisonPair({
  title,
  badge = 'การเปรียบเทียบหน้างานจริง (Side-by-Side Comparison)',
  left = { title: 'สภาพที่ 1', src: '', specs: [], desc: '' },
  right = { title: 'สภาพที่ 2', src: '', specs: [], desc: '' },
  conclusion = ''
}) {
  const { isDark } = useTheme();

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-4 ${
      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/30">
          {badge}
        </span>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Card */}
        <IndustrialPhotoCard 
          src={left.src}
          fallbackSrc={left.fallbackSrc}
          title={left.title}
          badge={left.badge || 'NORMAL / CONDITION 1'}
          badgeColor={left.badgeColor || 'slate'}
          specs={left.specs}
          description={left.desc}
        />

        {/* Right Card */}
        <IndustrialPhotoCard 
          src={right.src}
          fallbackSrc={right.fallbackSrc}
          title={right.title}
          badge={right.badge || 'DEFECT / CONDITION 2'}
          badgeColor={right.badgeColor || 'rose'}
          specs={right.specs}
          description={right.desc}
        />
      </div>

      {conclusion && (
        <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
          isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <FiInfo className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>ข้อสรุปเชิงวิศวกรรม:</strong> {conclusion}
          </div>
        </div>
      )}
    </div>
  );
}
