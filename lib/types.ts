export type MetodoPago = 'Yape' | 'Efectivo';
export type EstadoPago = 'Pagado' | 'Pendiente';
/**
 * Pendiente  → aún no escanea su ticket
 * PorRecoger → ticket escaneado, está en la cola de Cocina
 * Entregado  → cocina entregó y se validó como recibido
 */
export type EstadoEntrega = 'Pendiente' | 'PorRecoger' | 'Entregado';

export interface Ticket {
  /** UUID único del registro */
  id: string;
  /** Número correlativo impreso (1, 2, … 500, 501…) */
  numeroTicket: number;
  /** Firma aleatoria de 8 caracteres que va dentro del QR (anti-falsificación) */
  firma: string;
  comprador: string;
  telefono: string;
  metodoPago: MetodoPago;
  estadoPago: EstadoPago;
  estadoEntrega: EstadoEntrega;
  /** Agrupa los tickets comprados juntos (null si fue un solo ticket) */
  compraId: string | null;
  /** ISO timestamps */
  fechaRegistro: string;
  fechaPago: string | null;
  /** Cuándo se escaneó (entró a la cola de cocina) */
  fechaEscaneo: string | null;
  fechaEntrega: string | null;
}
