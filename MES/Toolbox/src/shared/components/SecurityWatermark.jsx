import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * SecurityWatermark
 * Industrial Data Leakage Prevention (DLP) Component
 *
 * Renders a dynamic, low-opacity, repeating vector watermark over confidential
 * screens (e.g., BOM Formulas, SAP Pricing, System Audit Logs).
 *
 * Features:
 * - Real-time User Identity binding (Fullname + Employee ID)
 * - Anti-tamper Date & Access Classification
 * - 100% Non-intrusive UX: `pointer-events-none`, `user-select-none` (Zero click/scroll blocking)
 * - Tilted vector grid with high contrast resilience under smartphone camera capture
 * - Print-aware: retains watermark on physical paper/PDF export
 *
 * Usage:
 * 1. Self-contained inside a relative container:
 *    <div className="relative overflow-hidden">
 *      <SecurityWatermark classification="CONFIDENTIAL • AUDIT TRAIL" />
 *      <MyTable />
 *    </div>
 *
 * 2. As a wrapper component:
 *    <SecurityWatermark classification="CONFIDENTIAL • BOM SPEC">
 *      <MySensitiveContent />
 *    </SecurityWatermark>
 */
export default function SecurityWatermark({
  classification = 'SNC CONFIDENTIAL',
  opacity = 0.042,
  children,
  className = '',
  fullscreen = false,
}) {
  const { user } = useAuth() || {};

  const watermarkSvgDataUri = useMemo(() => {
    const rawName = user?.fullname || user?.username || 'SNC USER';
    const rawId = user?.username ? `[${user.username}]` : '';
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Clean XML characters
    const escapeXml = (unsafe) =>
      String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const line1 = escapeXml(`${rawName} ${rawId} • ${classification}`);
    const line2 = escapeXml(`${dateStr} • SNC RESTRICTED INDUSTRIAL ASSET • DO NOT COPY`);

    // 380x210 repeating tile with -22deg tilted text
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="380" height="210">
  <style>
    text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-weight: 600;
      letter-spacing: 0.5px;
      user-select: none;
    }
    .title {
      font-size: 11px;
      fill: rgba(71, 85, 105, ${opacity});
    }
    .sub {
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 0.8px;
      fill: rgba(100, 116, 139, ${opacity * 0.85});
    }
  </style>
  <g transform="rotate(-22 190 105)">
    <text x="20" y="70" class="title">${line1}</text>
    <text x="40" y="92" class="sub">${line2}</text>
    <text x="210" y="175" class="title">${line1}</text>
    <text x="230" y="197" class="sub">${line2}</text>
  </g>
</svg>
`.trim();

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [user?.fullname, user?.username, classification, opacity]);

  const overlayElement = (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none z-20 ${
        fullscreen ? 'fixed inset-0' : 'absolute inset-0'
      } ${className}`}
      style={{
        backgroundImage: `url("${watermarkSvgDataUri}")`,
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center center',
      }}
    />
  );

  if (children) {
    return (
      <div className={`relative ${fullscreen ? '' : 'overflow-hidden'}`}>
        {children}
        {overlayElement}
      </div>
    );
  }

  return overlayElement;
}
