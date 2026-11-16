/**
 * Shared media URL candidate builder for Legacy (/MES/MES/uploads/...) and
 * Toolbox self-contained API readers. Enables dual-stage fallback on <img onError>
 * when server directory layout, PHP open_basedir, or legacy bare filenames vary.
 */

const BASE = import.meta.env.BASE_URL || '/iot-toolbox/sandbox-b9/Toolbox/';
const LEGACY_UPLOADS_BASE = '/iot-toolbox/sandbox-b9/MES/MES/uploads/';
const ROOT_UPLOADS_BASE = '/iot-toolbox/sandbox-b9/uploads/';

/**
 * Extracts a safe sanitized basename from any legacy/relative path or URL.
 */
export function extractMediaBasename(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const cleaned = rawPath.replace(/\\/g, '/').split('?')[0].trim();
  const base = cleaned.split('/').pop() || '';
  return /^[A-Za-z0-9._-]+$/.test(base) ? base : '';
}

/**
 * Strips leading ../ sequences and slashes to normalize relative "uploads/..." paths.
 */
export function normalizeRelativeUploadPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const cleaned = rawPath.replace(/\\/g, '/').trim();
  if (!cleaned) return '';
  const uploadsIdx = cleaned.indexOf('uploads/');
  if (uploadsIdx >= 0) {
    return cleaned.slice(uploadsIdx);
  }
  return cleaned.replace(/^(\.\.\/)+/, '').replace(/^\/+/, '');
}

/**
 * Returns an ordered array of unique candidate image URLs for Store item images.
 * Handles bare filenames stored in dbo.ITEMS.image_path (e.g. "10011564_1776312434.jpg").
 */
export function getStoreItemImageCandidates(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return [];
  const trimmed = rawPath.trim();
  if (!trimmed) return [];
  if (/^data:image\//i.test(trimmed)) return [trimmed];

  const out = [];
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    out.push(trimmed);
  }

  const basename = extractMediaBasename(trimmed);
  if (basename) {
    out.push(`${BASE}api/store/storeApi.php?action=view_image&file=${encodeURIComponent(basename)}`);
    out.push(`${LEGACY_UPLOADS_BASE}items/${encodeURIComponent(basename)}`);
    out.push(`${BASE}uploads/items/${encodeURIComponent(basename)}`);
  }

  return Array.from(new Set(out));
}

/**
 * Returns ordered candidate URLs for User Profile avatars across Toolbox & Legacy uploads.
 */
export function getProfileAvatarCandidates(profilePicture) {
  if (!profilePicture || typeof profilePicture !== 'string') return [];
  const trimmed = profilePicture.trim();
  if (!trimmed) return [];
  if (/^data:image\//i.test(trimmed)) return [trimmed];

  const out = [];
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    out.push(trimmed);
  }

  const basename = extractMediaBasename(trimmed);
  if (basename) {
    if (trimmed.startsWith('uploads/')) {
      out.push(`${BASE}${trimmed}`);
    }
    out.push(`${BASE}uploads/profile_pictures/${encodeURIComponent(basename)}`);
    out.push(`${LEGACY_UPLOADS_BASE}profile_pictures/${encodeURIComponent(basename)}`);
    out.push(`${ROOT_UPLOADS_BASE}profile_pictures/${encodeURIComponent(basename)}`);
  }

  return Array.from(new Set(out));
}

/**
 * Returns ordered candidate URLs for C-TPAT Loading Report photos.
 */
export function getLoadingPhotoCandidates(fileOrPath) {
  const cleanName = extractMediaBasename(fileOrPath);
  if (!cleanName) return [];
  return [
    `${BASE}api/loading/loadingApi.php?action=view_photo&file=${encodeURIComponent(cleanName)}`,
    `${LEGACY_UPLOADS_BASE}loading_reports/${encodeURIComponent(cleanName)}`,
    `${BASE}uploads/loading_reports/${encodeURIComponent(cleanName)}`,
  ];
}

/**
 * Returns ordered candidate URLs for PE Enterprise images (pe_images, spare_parts, maintenance).
 */
export function getPeImageCandidates(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return [];
  const trimmed = rawPath.trim();
  if (!trimmed) return [];
  if (/^data:image\//i.test(trimmed)) return [trimmed];

  const rel = normalizeRelativeUploadPath(trimmed);
  const out = [];
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    out.push(trimmed);
  }
  if (rel) {
    const apiRel = rel.startsWith('uploads/') ? rel : `uploads/pe_images/${rel}`;
    out.push(`${BASE}api/pe/peUploadApi.php?action=view_image&path=${encodeURIComponent(apiRel)}`);
    if (rel.startsWith('uploads/')) {
      out.push(`${LEGACY_UPLOADS_BASE}${rel.slice('uploads/'.length)}`);
      out.push(`${BASE}${rel}`);
    } else {
      out.push(`${LEGACY_UPLOADS_BASE}pe_images/${rel}`);
      out.push(`${LEGACY_UPLOADS_BASE}maintenance/${rel}`);
      out.push(`${LEGACY_UPLOADS_BASE}spare_parts/${rel}`);
    }
  }
  const basename = extractMediaBasename(trimmed);
  if (basename) {
    out.push(`${LEGACY_UPLOADS_BASE}pe_images/${encodeURIComponent(basename)}`);
    out.push(`${LEGACY_UPLOADS_BASE}maintenance/${encodeURIComponent(basename)}`);
    out.push(`${LEGACY_UPLOADS_BASE}spare_parts/${encodeURIComponent(basename)}`);
  }

  return Array.from(new Set(out));
}

/**
 * Returns ordered candidate URLs for QMS / Concession images.
 */
export function getQmsMediaCandidates(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return [];
  const trimmed = rawPath.trim();
  if (!trimmed) return [];
  if (/^data:image\//i.test(trimmed)) return [trimmed];

  const rel = normalizeRelativeUploadPath(trimmed);
  const out = [];
  if (rel) {
    const apiRel = rel.startsWith('uploads/') ? rel : `uploads/qms_files/${rel}`;
    out.push(`${BASE}api/qms/qmsUploadApi.php?action=view_image&path=${encodeURIComponent(apiRel)}`);
    if (rel.startsWith('uploads/')) {
      out.push(`${LEGACY_UPLOADS_BASE}${rel.slice('uploads/'.length)}`);
      out.push(`${BASE}${rel}`);
    }
  }
  return Array.from(new Set(out));
}
