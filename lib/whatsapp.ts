import { fmtNum, soloDigitos } from './evento';
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

/** Primer nombre con mayúscula inicial: "maría torres" → "María" */
function primerNombre(nombre: string) {
  const n = nombre.trim().split(/\s+/)[0] ?? '';
  return n ? n[0].toLocaleUpperCase('es-PE') + n.slice(1).toLocaleLowerCase('es-PE') : '';
}

/** Mensaje de WhatsApp para uno o varios tickets de una misma compra */
export function mensajeCompra(ts: Ticket[]) {
  const lista = [...ts].sort((a, b) => a.numeroTicket - b.numeroTicket);
  const nums = lista.map((t) => fmtNum(t.numeroTicket)).join(', ');
  const varios = lista.length > 1;
  return [
    `Buenos días ${primerNombre(lista[0].comprador)}, le envío ${varios ? 'sus tickets' : 'su ticket'} N° ${nums} 🎟️`,
    `El pago será en mesa.`,
    `Muestre ${varios ? 'los códigos QR' : 'el código QR'} al llegar para registrar ${varios ? 'sus tickets' : 'su ticket'}.`,
    ``,
    `🙏❤️ *Por la salud de Víctor Alejandro*`,
  ].join('\n');
}

export function mensajeTicket(t: Ticket) {
  return mensajeCompra([t]);
}
