import { EVENTO, fmtNum, qrPayload, soloDigitos } from './evento';
import type { Ticket } from './types';

/** 987654321 → 51987654321 (Perú). Si ya trae código de país lo respeta. */
export function telefonoInternacional(tel: string) {
  const d = soloDigitos(tel);
  if (d.length === 9 && d.startsWith('9')) return `51${d}`;
  return d;
}

export function waLink(tel: string, texto: string) {
  const d = telefonoInternacional(tel);
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}

export function mensajeTicket(t: Ticket) {
  const nombre = t.comprador.split(' ')[0] || t.comprador;
  const pago =
    t.estadoPago === 'Pagado'
      ? `✅ Pagado con ${t.metodoPago}`
      : `⏳ PENDIENTE DE PAGO (${t.metodoPago}) – S/ ${EVENTO.precio}`;
  return [
    `🎟️ *GRAN POLLADA BAILABLE*`,
    `Hola ${nombre}, aquí está tu ticket:`,
    ``,
    `*TICKET N° ${fmtNum(t.numeroTicket)}*`,
    `💰 S/ ${EVENTO.precio} · ${pago}`,
    `📍 ${EVENTO.lugar} (${EVENTO.referencia.toLowerCase()})`,
    `📅 ${EVENTO.fecha} · ⏰ ${EVENTO.hora}`,
    `🎧 Artista invitado: ${EVENTO.artista}`,
    `❤️ A beneficio de: ${EVENTO.beneficio}`,
    ``,
    `Muestra el código QR en cocina para recoger tu pollada.`,
    `Código: ${qrPayload(t)}`,
    `¡No faltes! 🍗🎶`,
  ].join('\n');
}

/** Mensaje para una compra de varios tickets */
export function mensajeCompra(ts: Ticket[]) {
  if (ts.length === 1) return mensajeTicket(ts[0]);
  const t = ts[0];
  const nombre = t.comprador.split(' ')[0] || t.comprador;
  const pendientes = ts.filter((x) => x.estadoPago === 'Pendiente').length;
  const pago =
    pendientes === 0
      ? `✅ Pagado con ${t.metodoPago}`
      : `⏳ PENDIENTE DE PAGO: S/ ${pendientes * EVENTO.precio} (${t.metodoPago})`;
  return [
    `🎟️ *GRAN POLLADA BAILABLE*`,
    `Hola ${nombre}, aquí están tus ${ts.length} tickets:`,
    ``,
    ...ts.map((x) => `*TICKET N° ${fmtNum(x.numeroTicket)}* · ${qrPayload(x)}`),
    ``,
    `💰 Total S/ ${ts.length * EVENTO.precio} · ${pago}`,
    `📍 ${EVENTO.lugar} (${EVENTO.referencia.toLowerCase()})`,
    `📅 ${EVENTO.fecha} · ⏰ ${EVENTO.hora}`,
    `🎧 Artista invitado: ${EVENTO.artista}`,
    `❤️ A beneficio de: ${EVENTO.beneficio}`,
    ``,
    `Cada imagen tiene su propio QR: muestra uno por cada pollada en cocina.`,
    `¡No faltes! 🍗🎶`,
  ].join('\n');
}
