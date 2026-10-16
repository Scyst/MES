/**
 * offlineAssets.js - Self-contained, offline-ready industrial SVG assets
 * Prevents 404 network errors and air-gapped intranet blockages on factory floors (10.0.0.2)
 */

export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%236366f1"><rect width="100" height="100" fill="%231e293b"/><circle cx="50" cy="38" r="20" fill="%23c084fc"/><path d="M20 85 C20 62 35 58 50 58 C65 58 80 62 80 85 Z" fill="%23a855f7"/></svg>`;

export function getUserAvatarSvg(name = 'MES') {
  const initial = (name.trim()[0] || 'M').toUpperCase();
  const colors = [
    ['%23ec4899', '%238b5cf6'], // pink - violet
    ['%233b82f6', '%2306b6d4'], // blue - cyan
    ['%2310b981', '%23059669'], // emerald - green
    ['%23f59e0b', '%23d97706'], // amber - orange
    ['%238b5cf6', '%236366f1']  // violet - indigo
  ];
  const charCode = name.charCodeAt(0) || 0;
  const [col1, col2] = colors[charCode % colors.length];

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${col1}"/><stop offset="100%" stop-color="${col2}"/></linearGradient></defs><rect width="100" height="100" rx="30" fill="url(%23g)"/><text x="50" y="65" font-size="42" font-family="sans-serif" font-weight="900" fill="white" text-anchor="middle">${initial}</text></svg>`;
}

export const CATEGORY_OFFLINE_IMAGES = {
  'เครื่องจักรและวิศวกรรมการผลิต': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%231e1b4b"/></linearGradient></defs><rect width="600" height="400" fill="url(%23g1)"/><circle cx="300" cy="180" r="90" fill="none" stroke="%23c084fc" stroke-width="8" stroke-dasharray="20 10"/><circle cx="300" cy="180" r="45" fill="%23a855f7" opacity="0.3"/><path d="M260 180 L340 180 M300 140 L300 220" stroke="%23f472b6" stroke-width="8"/><text x="300" y="320" font-size="24" font-family="sans-serif" font-weight="bold" fill="%23f8fafc" text-anchor="middle">MANUFACTURING &amp; ENGINEERING</text></svg>`,
  'โปรแกรมและระบบดิจิทัล': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%23083344"/></linearGradient></defs><rect width="600" height="400" fill="url(%23g2)"/><rect x="180" y="100" width="240" height="150" rx="16" fill="none" stroke="%2338bdf8" stroke-width="6"/><path d="M220 150 L250 175 L220 200 M270 200 L310 200" stroke="%2306b6d4" stroke-width="6" stroke-linecap="round"/><text x="300" y="320" font-size="24" font-family="sans-serif" font-weight="bold" fill="%23f8fafc" text-anchor="middle">DIGITAL SYSTEMS &amp; MES</text></svg>`,
  'ขั้นตอนการทำงานและระบบมาตรฐาน': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%23064e3b"/></linearGradient></defs><rect width="600" height="400" fill="url(%23g3)"/><polygon points="300,90 380,130 380,220 300,270 220,220 220,130" fill="none" stroke="%2334d399" stroke-width="6"/><path d="M270 175 L295 200 L340 150" fill="none" stroke="%2310b981" stroke-width="8" stroke-linecap="round"/><text x="300" y="320" font-size="24" font-family="sans-serif" font-weight="bold" fill="%23f8fafc" text-anchor="middle">STANDARD OPERATING SYSTEMS (ISO)</text></svg>`,
  'การตรวจโรงงานและเอกสารลูกค้า': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%23451a03"/></linearGradient></defs><rect width="600" height="400" fill="url(%23g4)"/><rect x="220" y="90" width="160" height="170" rx="12" fill="none" stroke="%23fbbf24" stroke-width="6"/><line x1="250" y1="130" x2="350" y2="130" stroke="%23f59e0b" stroke-width="5" stroke-linecap="round"/><line x1="250" y1="165" x2="350" y2="165" stroke="%23f59e0b" stroke-width="5" stroke-linecap="round"/><line x1="250" y1="200" x2="310" y2="200" stroke="%23f59e0b" stroke-width="5" stroke-linecap="round"/><text x="300" y="320" font-size="24" font-family="sans-serif" font-weight="bold" fill="%23f8fafc" text-anchor="middle">CUSTOMER AUDIT &amp; QUALITY</text></svg>`,
  'กรณีศึกษาหน้างานจริง': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%234c0519"/></linearGradient></defs><rect width="600" height="400" fill="url(%23g5)"/><polygon points="300,90 390,240 210,240" fill="none" stroke="%23fb7185" stroke-width="6"/><circle cx="300" cy="210" r="7" fill="%23f43f5e"/><line x1="300" y1="140" x2="300" y2="185" stroke="%23f43f5e" stroke-width="7" stroke-linecap="round"/><text x="300" y="320" font-size="24" font-family="sans-serif" font-weight="bold" fill="%23f8fafc" text-anchor="middle">REAL-WORLD GEMBA CASE STUDY</text></svg>`,
  'การบริหารและการเพิ่มผลผลิต': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%23311042"/></linearGradient></defs><rect width="600" height="400" fill="url(%23g6)"/><polyline points="200,230 260,190 320,210 390,130 420,150" fill="none" stroke="%23e879f9" stroke-width="7" stroke-linecap="round"/><polygon points="410,130 435,130 435,155" fill="%23e879f9"/><text x="300" y="320" font-size="24" font-family="sans-serif" font-weight="bold" fill="%23f8fafc" text-anchor="middle">PRODUCTIVITY &amp; LEAN GEMBA</text></svg>`
};

export const DEFAULT_COURSE_IMAGE = CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'];
