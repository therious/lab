export function envBadgeColor(): string | null {
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return '#ff8c00';
  return null;
}

export function badgeFavicon(color: string | null): void {
  if (!color) return;
  const all = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="shortcut icon"]'));
  // Prefer PNG — the lotto SVG has no width/height attrs which breaks canvas drawImage
  const source = all.find(l => l.href.includes('-32x32.png')) ?? all.find(l => l.href.includes('.png')) ?? all[0] ?? null;
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const finish = () => {
    const fontSize = Math.round(size * 0.68);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.12));
    ctx.strokeText('L', 0, size + Math.round(fontSize * 0.15));
    ctx.fillStyle = color;
    ctx.fillText('L', 0, size + Math.round(fontSize * 0.15));
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach(l => l.remove());
    const link = document.createElement('link');
    link.rel = 'icon'; link.type = 'image/png'; link.href = canvas.toDataURL('image/png');
    document.head.appendChild(link);
  };
  if (!source?.href) { finish(); return; }
  const img = new Image();
  img.onload = () => { ctx.drawImage(img, 0, 0, size, size); finish(); };
  img.onerror = finish;
  img.src = source.href;
}
