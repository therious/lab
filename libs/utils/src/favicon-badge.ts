/**
 * Overlays a small letter on the current favicon at runtime.
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
  if (h === 'localhost' || h === '127.0.0.1') return '#ff8c00'; // orange — local
  if (h.includes('staging') || h.includes('preview') || h.includes('netlify')) return '#a855f7'; // purple — preview/staging
  return null; // production — leave favicon untouched
}

/** Picks the best favicon link to use as a base (SVG > PNG > other > ICO). */
function bestFaviconLink(): HTMLLinkElement | null {
  const all = Array.from(document.querySelectorAll<HTMLLinkElement>(
    'link[rel~="icon"], link[rel="shortcut icon"]'
  ));
  return (
    all.find(l => l.href.includes('.svg')) ??
    all.find(l => l.href.includes('.png')) ??
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
  const fontSize = Math.round(size * 0.68);
  ctx.font         = `bold ${fontSize}px sans-serif`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'bottom';

  // Thin dark outline for legibility on any background
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth   = Math.max(2, Math.round(fontSize * 0.12));
  ctx.strokeText('L', 0, size + Math.round(fontSize * 0.15));

  ctx.fillStyle = color;
  ctx.fillText('L', 0, size + Math.round(fontSize * 0.15));
}

/** Draws an 'L' badge over the existing favicon and replaces all favicon links. */
export function badgeFavicon(color: string | null): void {
  if (!color) return;

  const source = bestFaviconLink();
  const size   = 32;
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const finish = () => {
    drawBadge(ctx, size, color);
    replaceAllFavicons(canvas.toDataURL('image/png'));
  };

  if (!source?.href) {
    finish();
    return;
  }

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, size, size);
    finish();
  };
  img.onerror = finish;
  img.src = source.href;
}
