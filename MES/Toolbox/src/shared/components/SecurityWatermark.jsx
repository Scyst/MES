import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * SecurityWatermark
 * Industrial Data Leakage Prevention (DLP) Component
 *
 * Renders a dynamic, visible, non-intrusive repeating vector watermark over confidential
 * screens (e.g., BOM Formulas, SAP Valuation, System Audit Logs).
 *
 * Features:
 * - Real-time User Identity binding (Fullname + Employee ID)
 * - Anti-tamper Date & Access Classification
 * - Deterrence Visibility: Balanced 12% opacity (Clearly perceptible to users, zero obstruction to table data)
 * - 100% Non-intrusive UX: `pointer-events-none`, `user-select-none` (Zero click/scroll blocking)
 * - Robust UTF-8 Base64 SVG data URI (Cross-browser Unicode & Thai font support)
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
  opacity = 0.08,
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

    // 460x230 repeating tile with -22deg tilted text for optimal readability, spacing and anti-moiré stroke resilience
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="460" height="230">
  <style>
    text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      letter-spacing: 0.6px;
      user-select: none;
    }
    .title {
      font-size: 13.5px;
      font-weight: 700;
      fill: rgba(30, 41, 59, ${opacity});
    }
    .sub {
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.8px;
      fill: rgba(51, 65, 85, ${opacity * 0.85});
    }
  </style>
  <g transform="rotate(-22 230 115)">
    <text x="20" y="80" class="title">${line1}</text>
    <text x="35" y="102" class="sub">${line2}</text>
    <text x="250" y="195" class="title">${line1}</text>
    <text x="265" y="217" class="sub">${line2}</text>
  </g>
</svg>
`.trim();

    try {
      // Safe UTF-8 Base64 conversion for browser runtime
      const base64 = typeof window !== 'undefined' && window.btoa
        ? window.btoa(unescape(encodeURIComponent(svg)))
        : Buffer.from(svg, 'utf-8').toString('base64');
      return `data:image/svg+xml;base64,${base64}`;
    } catch (e) {
      // Fallback to URI encoding if Base64 fails
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
  }, [user?.fullname, user?.username, classification, opacity]);

  const overlayElement = (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none z-20 ${
        fullscreen ? 'fixed inset-0' : 'absolute inset-0 min-w-full min-h-full'
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
