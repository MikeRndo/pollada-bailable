import { PRECIO, fechaHora, fmtNum, qrPayload } from './evento';
import type { Ticket } from './types';
import { crearExcel } from './excel';

export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const sello = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

/** CSV con BOM UTF-8 para que Excel muestre bien tildes y la ñ */
export function exportarCSV(tickets: Ticket[]) {
  const enc = [
    'N° Ticket',
    'Comprador',
    'Vendedor',
    'Teléfono',
    'Método de pago',
    'Estado de pago',
    'Monto (S/)',
    'Estado de entrega',
    'Fecha registro',
    'Fecha pago',
    'Fecha escaneo (a cocina)',
    'Fecha recibido',
    'Código QR',
  ];
  const filas = [...tickets]
    .sort((a, b) => a.numeroTicket - b.numeroTicket)
    .map((t) => [
      fmtNum(t.numeroTicket),
      t.comprador,
      t.vendedor,
      t.telefono,
      t.metodoPago,
      t.estadoPago,
      t.estadoPago === 'Pagado' ? PRECIO : 0,
      { Pendiente: 'Sin escanear', PorRecoger: 'En cocina', Entregado: 'Recibido' }[t.estadoEntrega],
      fechaHora(t.fechaRegistro),
      fechaHora(t.fechaPago),
      fechaHora(t.fechaEscaneo),
      fechaHora(t.fechaEntrega),
      qrPayload(t),
    ]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [enc, ...filas].map((f) => f.map(esc).join(',')).join('\r\n');
  descargarBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `pollada-registro-${sello()}.csv`);
}

/** Excel real (.xlsx) con formato: cada dato en su celda + hoja Resumen */
export async function exportarExcel(tickets: Ticket[]) {
  const xlsx = await crearExcel(tickets);
  descargarBlob(xlsx, `pollada-registro-${sello()}.xlsx`);
}

export function exportarJSON(datos: { tickets: Ticket[]; capacidad: number }) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  descargarBlob(blob, `pollada-respaldo-${sello()}.json`);
}
