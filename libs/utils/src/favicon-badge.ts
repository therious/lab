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
  return null; // deployed — leave favicon untouched
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

  const all = Array.from(document.querySelectorAll<HTMLLinkElement>(
    'link[rel~="icon"], link[rel="shortcut icon"]'
  ));
  const svgLink = all.find(l => l.href.includes('.svg')) ?? null;
  const pngLink = all.find(l => l.href.includes('.png')) ?? null;
  const size = 32;

  const makeCanvas = () => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  };

  const applyBadge = (c: HTMLCanvasElement) => {
    drawBadge(c.getContext('2d')!, size, color);
    replaceAllFavicons(c.toDataURL('image/png'));
  };

  const loadImage = (href: string, onLoad: (img: HTMLImageElement) => void) => {
    const img = new Image();
    img.onload = () => onLoad(img);
    img.onerror = () => applyBadge(makeCanvas()); // badge on blank as last resort
    img.src = href;
  };

  const tryPng = () => {
    if (!pngLink) { applyBadge(makeCanvas()); return; }
    loadImage(pngLink.href, img => {
      const c = makeCanvas();
      if (img.naturalWidth > 0) c.getContext('2d')!.drawImage(img, 0, 0, size, size);
      applyBadge(c);
    });
  };

  if (!svgLink) { tryPng(); return; }

  loadImage(svgLink.href, img => {
    const c = makeCanvas();
    if (img.naturalWidth > 0) c.getContext('2d')!.drawImage(img, 0, 0, size, size);
    try {
      applyBadge(c);            // throws if SVG had <foreignObject>
    } catch (_) {
      tryPng();                 // fresh canvas, uncontaminated by the SVG
    }
  });
}
