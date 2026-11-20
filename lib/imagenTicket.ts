'use client';

/**
 * Genera la imagen JPG de un ticket dibujando directo en un <canvas>:
 * afiche original + recuadro blanco + QR + "N° 0501".
 * Es muchísimo más liviano que "fotografiar" el HTML, así que aguanta 25, 50 o más tickets.
 */

const ANCHO = 1536;
const ALTO = 1024;
const CAJA = { x: 1067, y: 402, w: 258, h: 296 };

let afiche: Promise<HTMLImageElement> | null = null;

function cargarImagen(src: string) {
  return new Promise<HTMLImageElement>((ok, mal) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => ok(img);
    img.onerror = () => mal(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

/** El afiche se descarga una sola vez y se reutiliza para todos los tickets */
export function cargarAfiche(src: string) {
  if (!afiche) afiche = cargarImagen(src).catch((e) => ((afiche = null), Promise.reject(e)));
  return afiche;
}

/** Fuente gruesa del número (la misma Luckiest Guy de la app) */
function fuenteNumero() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-luckiest').trim();
  return v || 'Impact, sans-serif';
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * @param qrSvg  el <svg> del QR ya dibujado por qrcode.react (se serializa y se pega en el canvas)
 * @param escala 1 = 1536 px (máxima calidad); 0.75 para muchos tickets
 */
export async function generarImagenTicket(opts: {
  afiche: HTMLImageElement;
  qrSvg: SVGSVGElement;
  numero: string;
  escala?: number;
}): Promise<Blob> {
  const s = opts.escala ?? 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(ANCHO * s);
  canvas.height = Math.round(ALTO * s);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.scale(s, s);

  // 1) Afiche original
  ctx.drawImage(opts.afiche, 0, 0, ANCHO, ALTO);

  // 2) Recuadro blanco "QR TM"
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(CAJA.x, CAJA.y, CAJA.w, CAJA.h);

  // 3) QR (vectorial → nítido a cualquier tamaño)
  const pad = 14;
  const lado = 206;
  const svgTxt = new XMLSerializer().serializeToString(opts.qrSvg);
  const url = URL.createObjectURL(new Blob([svgTxt], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const qr = await cargarImagen(url);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qr, CAJA.x + (CAJA.w - lado) / 2, CAJA.y + pad, lado, lado);
    ctx.imageSmoothingEnabled = true;
  } finally {
    URL.revokeObjectURL(url);
  }

  // 4) Franja roja con el número
  const bx = CAJA.x + pad;
  const bw = CAJA.w - pad * 2;
  const bh = 56;
  const by = CAJA.y + CAJA.h - 11 - bh;
  ctx.fillStyle = '#d7141f';
  rect(ctx, bx, by, bw, bh, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(bx + 4, by + bh - 5, bw - 8, 5);

  const texto = `N° ${opts.numero}`;
  ctx.font = `42px ${fuenteNumero()}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = bx + bw / 2;
  const cy = by + bh / 2 + 2;
  ctx.fillStyle = '#5a0006';
  ctx.fillText(texto, cx, cy + 3);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#5a0006';
  ctx.strokeText(texto, cx, cy);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(texto, cx, cy);

  return new Promise<Blob>((ok, mal) =>
    canvas.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear la imagen'))), 'image/jpeg', 0.9),
  );
}
