import React, { useRef, useState } from 'react';
import { Camera, Eye, Loader2, Trash2, X } from 'lucide-react';
import { getLoadingPhotoUrl, loadingReportApi } from '../../../shared/services/loadingApi';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import { CTPAT_PHOTO_POINTS, compressInspectionImage } from '../utils/ctpatConfig';

/**
 * 16-point C-TPAT loading photo evidence grid with client-side image compression,
 * instant gallery lightbox preview, retake/replace, and audited delete.
 */
export default function CtpatPhotoGrid({
  reportId,
  photos,
  isCompleted,
  isOffline,
  isReadOnly,
  onPhotoChanged,
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const fileInputs = useRef({});
  const [uploadingKey, setUploadingKey] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const locked = isCompleted || isOffline || isReadOnly;

  const handleSelectFile = async (pointKey, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || locked) return;
    if (!reportId) {
      toast.warning('กรุณากด "บันทึกข้อมูลส่วนหัว" ก่อนอัปโหลดรูปภาพ');
      return;
    }

    setUploadingKey(pointKey);
    try {
      const compressedBlob = await compressInspectionImage(file, 1280, 0.8);
      await loadingReportApi.uploadPhoto(reportId, pointKey, compressedBlob, `${pointKey}.jpg`);
      toast.success('อัปโหลดภาพหลักฐานเรียบร้อย');
      await onPhotoChanged?.();
    } catch (err) {
      toast.error(err.message || 'อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleDelete = async (point) => {
    if (locked || !reportId) return;
    const ok = await confirm({
      title: 'ลบรูปภาพหลักฐาน',
      message: `ต้องการลบรูป "${point.label}" ใช่หรือไม่?`,
      confirmText: 'ยืนยันลบ',
      danger: true,
    });
    if (!ok) return;

    try {
      await loadingReportApi.deletePhoto(reportId, point.key);
      toast.success('ลบรูปภาพเรียบร้อย');
      await onPhotoChanged?.();
    } catch (err) {
      toast.error(err.message || 'ลบรูปภาพไม่สำเร็จ');
    }
  };

  const uploadedCount = CTPAT_PHOTO_POINTS.filter((pt) => Boolean(photos?.[pt.key])).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            ภาพถ่ายหลักฐาน C-TPAT 16 จุด (Photo Evidence)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            อัปโหลดแล้ว {uploadedCount} / {CTPAT_PHOTO_POINTS.length} จุด (ระบบจะลดขนาดภาพอัตโนมัติก่อนส่ง)
          </p>
        </div>
        {!reportId && (
          <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            กรุณาบันทึกข้อมูลส่วนหัวก่อนเริ่มถ่ายภาพ
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {CTPAT_PHOTO_POINTS.map((point) => {
          const filename = photos?.[point.key];
          const url = filename ? getLoadingPhotoUrl(filename) : '';
          const isBusy = uploadingKey === point.key;

          return (
            <div
              key={point.key}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/60"
            >
              <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <span className="line-clamp-1">{point.label}</span>
                {point.claimOptional && (
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500 dark:bg-slate-700">
                    Optional
                  </span>
                )}
              </div>

              <div className="relative flex aspect-[4/3] items-center justify-center bg-slate-100 dark:bg-slate-900">
                {url ? (
                  <img
                    src={url}
                    alt={point.label}
                    className="h-full w-full object-cover cursor-pointer"
                    onClick={() => setPreviewPhoto({ url, label: point.label })}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <Camera className="h-7 w-7 opacity-60" />
                    <span className="text-[11px]">ยังไม่มีภาพ</span>
                  </div>
                )}

                {isBusy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 text-white">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="mt-1 text-[11px]">กำลังอัปโหลด...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 p-2">
                <input
                  ref={(el) => {
                    fileInputs.current[point.key] = el;
                  }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleSelectFile(point.key, e)}
                  className="hidden"
                />
                {!locked && (
                  <button
                    type="button"
                    disabled={isBusy || !reportId}
                    onClick={() => fileInputs.current[point.key]?.click()}
                    className="flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg bg-slate-900 px-2.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>{url ? 'ถ่ายใหม่' : 'ถ่าย / เลือกภาพ'}</span>
                  </button>
                )}
                {url && (
                  <button
                    type="button"
                    onClick={() => setPreviewPhoto({ url, label: point.label })}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                    aria-label={`ดูภาพ ${point.label}`}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {url && !locked && (
                  <button
                    type="button"
                    onClick={() => handleDelete(point)}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/30"
                    aria-label={`ลบภาพ ${point.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-12 right-0 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              aria-label="ปิดภาพตัวอย่าง"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={previewPhoto.url} alt={previewPhoto.label} className="max-h-[82vh] rounded-xl object-contain" />
            <p className="mt-2 text-center text-sm font-semibold text-white">{previewPhoto.label}</p>
          </div>
        </div>
      )}
    </div>
  );
}
