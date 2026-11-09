import * as THREE from 'three';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function tex(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight = 800, family = 'system-ui, Segoe UI, Arial, sans-serif') {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    s -= 2;
  } while (ctx.measureText(text).width > maxW && s > 8);
}

/** Wrap-around label for cans/bottles, or front face for box/bag. */
export function labelTexture(opts: { color: string; labelText: string; labelColor: string; accentColor?: string; wrap: boolean }): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 256);
  ctx.fillStyle = opts.color;
  ctx.fillRect(0, 0, 512, 256);
  const accent = opts.accentColor ?? opts.labelColor;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.85;
  if (opts.wrap) {
    // wave stripe around the can
    ctx.beginPath();
    ctx.moveTo(0, 170);
    for (let x = 0; x <= 512; x += 8) ctx.lineTo(x, 170 + Math.sin((x / 512) * Math.PI * 4) * 14);
    ctx.lineTo(512, 200);
    for (let x = 512; x >= 0; x -= 8) ctx.lineTo(x, 200 + Math.sin((x / 512) * Math.PI * 4) * 14);
    ctx.fill();
  } else {
    ctx.fillRect(0, 196, 512, 22);
    ctx.beginPath();
    ctx.arc(420, 60, 34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = opts.labelColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = opts.labelText || '';
  if (opts.wrap) {
    // repeat twice so it's visible from any angle
    fitText(ctx, text, 220, 80);
    ctx.fillText(text, 128, 110);
    ctx.fillText(text, 384, 110);
  } else {
    fitText(ctx, text, 440, 96);
    ctx.fillText(text, 256, 120);
  }
  return tex(c);
}

export function codeTagTexture(code: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 64);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#fff';
  ctx.font = '700 44px ui-monospace, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, 64, 34);
  return tex(c);
}

export function keyTexture(label: string, bg = '#e6e6e6', fg = '#222'): THREE.CanvasTexture {
  const [c, ctx] = canvas(96, 72);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 96, 72);
  ctx.fillStyle = fg;
  ctx.font = `800 ${label.length > 1 ? 30 : 44}px system-ui, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 48, 38);
  return tex(c);
}

export function headerTexture(name: string, bg: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(1024, 128);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 128);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitText(ctx, name, 940, 84, 900);
  ctx.fillText(name, 512, 68);
  return tex(c);
}

export function textTexture(text: string, w = 256, h = 64, fg = '#fff', bg = 'transparent', size = 36): THREE.CanvasTexture {
  const [c, ctx] = canvas(w, h);
  if (bg !== 'transparent') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitText(ctx, text, w - 12, size, 700);
  ctx.fillText(text, w / 2, h / 2 + 2);
  return tex(c);
}

export interface LedDisplay {
  mesh: THREE.Mesh;
  set(text: string): void;
}

export function createLed(width: number, height: number): LedDisplay {
  const [c, ctx] = canvas(512, Math.round((512 * height) / width));
  const t = tex(c);
  const mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  const set = (text: string) => {
    ctx.fillStyle = '#0a0f0a';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#58ff7a';
    ctx.shadowColor = '#2bff58';
    ctx.shadowBlur = 12;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitText(ctx, text, c.width - 24, Math.round(c.height * 0.6), 700, 'ui-monospace, Consolas, monospace');
    ctx.fillText(text, c.width / 2, c.height / 2 + 2);
    ctx.shadowBlur = 0;
    t.needsUpdate = true;
  };
  set('');
  return { mesh, set };
}
