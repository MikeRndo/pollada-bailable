import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Ticket } from './types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** null = modo solo LocalStorage */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } }) : null;

export interface TicketRow {
  id: string;
  numero: number;
  compra_id: string | null;
  firma: string;
  comprador: string;
  telefono: string;
  metodo_pago: Ticket['metodoPago'];
  estado_pago: Ticket['estadoPago'];
  estado_entrega: Ticket['estadoEntrega'];
  fecha_registro: string;
  fecha_pago: string | null;
  fecha_entrega: string | null;
}

export const fromRow = (r: TicketRow): Ticket => ({
  id: r.id,
  numeroTicket: r.numero,
  compraId: r.compra_id ?? null,
  firma: r.firma,
  comprador: r.comprador,
  telefono: r.telefono,
  metodoPago: r.metodo_pago,
  estadoPago: r.estado_pago,
  estadoEntrega: r.estado_entrega,
  fechaRegistro: r.fecha_registro,
  fechaPago: r.fecha_pago,
  fechaEntrega: r.fecha_entrega,
});

export const toRow = (t: Ticket): TicketRow => ({
  id: t.id,
  numero: t.numeroTicket,
  compra_id: t.compraId ?? null,
  firma: t.firma,
  comprador: t.comprador,
  telefono: t.telefono,
  metodo_pago: t.metodoPago,
  estado_pago: t.estadoPago,
  estado_entrega: t.estadoEntrega,
  fecha_registro: t.fechaRegistro,
  fecha_pago: t.fechaPago,
  fecha_entrega: t.fechaEntrega,
});
