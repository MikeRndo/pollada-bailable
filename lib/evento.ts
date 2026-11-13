import type { Ticket } from './types';

/** Datos fijos del afiche */
export const EVENTO = {
  titulo: 'Gran Pollada Pro Salud',
  artista: 'DJ Julio',
  beneficio: 'Pro Salud',
  lugar: 'Frente al Parque Los Jazmines',
  referencia: 'A espaldas del Pedagógico de Huaraz',
  fecha: '28 de noviembre del 2026',
  hora: '11:00 AM',
  precio: 15,
} as const;

export const PRECIO = EVENTO.precio;
/** Cantidad de tickets del lote inicial */
export const STOCK_INICIAL = 500;
/** Primer número de ticket: la numeración empieza en N° 500 y sube (500, 501, 502…) */
export const NUMERO_INICIAL = 500;
/** Último número disponible según la cantidad de cupos (500 cupos → N° 500 al 999) */
export const ultimoNumero = (capacidad: number) => NUMERO_INICIAL + capacidad - 1;
export const enStock = (n: number, capacidad: number) => n >= NUMERO_INICIAL && n <= ultimoNumero(capacidad);

/** 1 → "001", 42 → "042", 1000 → "1000" */
export const fmtNum = (n: number) => String(n).padStart(n >= 1000 ? 4 : 3, '0');

/** Contenido del QR: POLLADA-2026-042-9F3A1C0B (número + firma aleatoria anti-fraude) */
export const qrPayload = (t: Pick<Ticket, 'numeroTicket' | 'firma'>) =>
  `POLLADA-2026-${fmtNum(t.numeroTicket)}-${t.firma}`;

/** Acepta el formato nuevo y el antiguo (TICKET-042-XXXX) por si ya imprimiste tickets */
export function parseQr(texto: string): { numero: number; firma: string } | null {
  const m = texto
    .trim()
    .toUpperCase()
    .match(/^(?:POLLADA-\d{4}|TICKET)-(\d{1,5})-([A-F0-9]{8})$/);
  return m ? { numero: parseInt(m[1], 10), firma: m[2] } : null;
}

export const soles = (n: number) =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const horaCorta = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';

export const fechaHora = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '';

export function nuevoId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function nuevaFirma(): string {
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const soloDigitos = (s: string) => s.replace(/\D/g, '');

/** [1,2,3,7] → "001–003, 007" */
export function rangos(nums: number[]): string {
  const s = [...nums].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(j > i ? `${fmtNum(s[i])}–${fmtNum(s[j])}` : fmtNum(s[i]));
    i = j;
  }
  return out.join(', ');
}

/** "45, 46 50-52" → [45,46,50,51,52] */
export function parseNumeros(texto: string): { nums: number[]; error: string | null } {
  const partes = texto.split(/[\s,;]+/).filter(Boolean);
  const nums: number[] = [];
  for (const p of partes) {
    const r = p.match(/^(\d+)[-–](\d+)$/);
    if (r) {
      const a = parseInt(r[1], 10);
      const b = parseInt(r[2], 10);
      if (b < a) return { nums, error: `Rango al revés: ${p}` };
      if (b - a > 49) return { nums, error: `Rango muy largo: ${p}` };
      for (let n = a; n <= b; n++) nums.push(n);
    } else if (/^\d+$/.test(p)) {
      nums.push(parseInt(p, 10));
    } else {
      return { nums, error: `No entiendo "${p}"` };
    }
  }
  const unicos = [...new Set(nums)];
  return { nums: unicos, error: unicos.length !== nums.length ? 'Hay números repetidos.' : null };
}
