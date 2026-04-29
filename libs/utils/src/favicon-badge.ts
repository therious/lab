/**
 * Overlays a small colored dot on the current favicon at runtime.
 * Call once on app startup to badge local/staging/etc. tabs.
 *
 * Usage:
 *   import { badgeFavicon, envBadgeColor } from '@therious/utils/favicon-badge';
 *   badgeFavicon(envBadgeColor());   // auto-detect
 *   badgeFavicon('#f97316');         // explicit color; pass null to skip
 */

/** Returns a badge color based on hostname, or null for production (no badge). */
export function envBadgeColor(): string | null {
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return '#f97316'; // orange — local
  if (h.includes('staging') || h.includes('preview') || h.includes('netlify')) return '#a855f7'; // purple — preview/staging
  return null; // production — leave favicon untouched
}

/** Draws a filled dot in the bottom-right corner of the current page favicon. */
export function badgeFavicon(color: string | null): void {
  if (!color) return;

  const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link?.href) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const size = Math.max(img.naturalWidth, img.naturalHeight, 32);
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(img, 0, 0, size, size);

    // Dot: radius ~28% of icon size, anchored 2px from bottom-right
    const r = Math.round(size * 0.28);
    const cx = size - r - 2;
    const cy = size - r - 2;

    // White halo so the dot is visible on any favicon background
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    link.href = canvas.toDataURL('image/png');
  };
  img.src = link.href;
}
