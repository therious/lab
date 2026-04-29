/**
 * Overlays a small colored dot on the current favicon at runtime.
 * Call once on app startup to badge local/staging/etc. tabs.
 *
 * Usage:
 *   import { badgeFavicon, envBadgeColor } from '@therious/utils';
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

/** Picks the best favicon link to use as a base (PNG/SVG preferred over ICO). */
function bestFaviconLink(): HTMLLinkElement | null {
  const all = Array.from(document.querySelectorAll<HTMLLinkElement>(
    'link[rel~="icon"], link[rel="shortcut icon"]'
  ));
  // Prefer PNG then SVG then anything, skip .ico
  return (
    all.find(l => l.href.includes('.png')) ??
    all.find(l => l.href.includes('.svg')) ??
    all.find(l => !l.href.includes('.ico')) ??
    all[0] ??
    null
  );
}

/** Removes all favicon links and inserts a single replacement. */
function replaceAllFavicons(dataUrl: string): void {
  document.querySelectorAll<HTMLLinkElement>(
    'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
  ).forEach(l => l.remove());

  const link = document.createElement('link');
  link.rel  = 'icon';
  link.type = 'image/png';
  link.href = dataUrl;
  document.head.appendChild(link);
}

function drawBadge(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const r  = Math.round(size * 0.28);
  const cx = size - r - 2;
  const cy = size - r - 2;

  // White halo so the dot is visible on any background
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/** Draws a colored dot over the existing favicon and replaces all favicon links. */
export function badgeFavicon(color: string | null): void {
  if (!color) return;

  const source = bestFaviconLink();
  const size   = 32;
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (!source?.href) {
    // No existing favicon — draw badge on blank canvas
    drawBadge(ctx, size, color);
    replaceAllFavicons(canvas.toDataURL('image/png'));
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.drawImage(img, 0, 0, size, size);
    drawBadge(ctx, size, color);
    replaceAllFavicons(canvas.toDataURL('image/png'));
  };
  img.onerror = () => {
    // Image failed to load (e.g. ICO) — badge on blank canvas
    drawBadge(ctx, size, color);
    replaceAllFavicons(canvas.toDataURL('image/png'));
  };
  img.src = source.href;
}
