'use client';

/** Efectos de sonido tipo POS con Web Audio API (sin archivos de audio). */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Llamar dentro de un toque del usuario (iOS/Android bloquean el audio hasta entonces). */
export function desbloquearAudio() {
  audio();
}

function tono(freq: number, inicio: number, dur: number, tipo: OscillatorType = 'square', vol = 0.28) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + inicio;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.setValueAtTime(vol, t0 + Math.max(0.02, dur - 0.04));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function vibrar(patron: number | number[]) {
  try {
    navigator.vibrate?.(patron);
  } catch {
    /* algunos navegadores no lo soportan */
  }
}

/** Verde: pitido agudo 1000 Hz */
export function sonidoValido() {
  tono(1000, 0, 0.18, 'square', 0.25);
  vibrar(90);
}

/** Amarillo: alerta de tres tonos */
export function sonidoPendiente() {
  tono(880, 0, 0.14, 'triangle', 0.4);
  tono(660, 0.18, 0.14, 'triangle', 0.4);
  tono(880, 0.36, 0.2, 'triangle', 0.4);
  vibrar([120, 70, 120]);
}

/** Rojo: pitido grave 300 Hz */
export function sonidoError() {
  tono(300, 0, 0.65, 'sawtooth', 0.3);
  vibrar([320, 120, 320]);
}

/** Venta registrada (caja registradora corta) */
export function sonidoVenta() {
  tono(1318, 0, 0.08, 'sine', 0.3);
  tono(1760, 0.09, 0.14, 'sine', 0.3);
}
