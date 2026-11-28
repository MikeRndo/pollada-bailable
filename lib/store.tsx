'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { EstadoPago, MetodoPago, Ticket } from './types';
import { STOCK_INICIAL, enStock, fmtNum, nuevaFirma, nuevoId, numeroDeIndice, rangoStock } from './evento';
import { fromRow, supabase, toRow, type TicketRow } from './supabase';

const LS_KEY = 'pollada-bailable:v1';

export type CodigoError =
  | 'DUPLICADO'
  | 'FUERA_STOCK'
  | 'AGOTADO'
  | 'INVALIDO'
  | 'NO_EXISTE'
  | 'YA_ENTREGADO'
  | 'YA_ESCANEADO'
  | 'IMPAGO'
  | 'RED';

export type Resultado<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: CodigoError; ticket?: Ticket };

export const MAX_POR_COMPRA = 20;

export interface NuevaCompra {
  comprador: string;
  vendedor: string;
  telefono: string;
  metodoPago: MetodoPago;
  estadoPago: EstadoPago;
  /** Pago parcial: cuántos de los tickets se pagan ahora (el resto queda pendiente) */
  pagados?: number;
  /** Para sumar tickets a una compra que ya existe */
  compraId?: string;
  /** Cantidad de tickets con numeración automática (siguientes libres) */
  cantidad?: number;
  /** Números físicos ingresados a mano (si viene, ignora "cantidad") */
  numeros?: number[];
}

interface Datos {
  tickets: Ticket[];
  capacidad: number;
}

interface TicketsCtx extends Datos {
  listo: boolean;
  modo: 'local' | 'supabase';
  porNumero: Map<number, Ticket>;
  /** Menor número libre dentro del stock, o null si está agotado */
  siguiente: number | null;
  disponibles: number;
  /** Los N menores números libres dentro del stock */
  libres: (n: number) => number[];
  registrar: (c: NuevaCompra) => Promise<Resultado<Ticket[]>>;
  marcarPagado: (id: string, metodo: MetodoPago) => Promise<Resultado<Ticket>>;
  /** Corrige un pago marcado por error: el ticket vuelve a 'Pendiente' de pago */
  quitarPago: (id: string) => Promise<Resultado<Ticket>>;
  /** Escáner: ticket pagado → pasa a la cola de Cocina ("Por recoger") */
  escanear: (id: string) => Promise<Resultado<Ticket>>;
  /** Cocina: entrega la pollada y la valida como recibida */
  entregar: (id: string) => Promise<Resultado<Ticket>>;
  /** Deshacer una entrega marcada por error (vuelve a la cola de Cocina) */
  devolverACocina: (id: string) => Promise<Resultado<Ticket>>;
  /** Corrige un escaneo por error: el ticket vuelve a 'Sin escanear' (sale de cocina) */
  quitarEscaneo: (id: string) => Promise<Resultado<Ticket>>;
  eliminar: (id: string) => Promise<Resultado<null>>;
  /** Corrige comprador / celular / vendedor de uno o varios tickets (el QR no cambia) */
  /** Agrega más tickets a una compra ya registrada (mismo comprador, celular y vendedor) */
  agregarACompra: (
    ids: string[],
    extra: Pick<NuevaCompra, 'cantidad' | 'numeros' | 'pagados' | 'metodoPago'>,
  ) => Promise<Resultado<Ticket[]>>;
  editarDatos: (
    ids: string[],
    datos: { comprador: string; telefono: string; vendedor: string },
  ) => Promise<Resultado<null>>;
  agregarCupos: (n: number) => Promise<Resultado<number>>;
  importar: (datos: unknown) => Resultado<number>;
}

const Ctx = createContext<TicketsCtx | null>(null);
const porNum = (a: Ticket, b: Ticket) => a.numeroTicket - b.numeroTicket;

const fallo = <T,>(code: CodigoError, error: string, ticket?: Ticket): Resultado<T> => ({
  ok: false,
  code,
  error,
  ticket,
});

function esDatos(d: unknown): d is Datos {
  const x = d as Datos;
  return !!x && Array.isArray(x.tickets) && typeof x.capacidad === 'number';
}

function leerLocal(): Datos | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const d: unknown = JSON.parse(raw);
    if (!esDatos(d)) return null;
    // Compatibilidad con registros de versiones anteriores
    return {
      ...d,
      tickets: d.tickets.map((t) => ({ ...t, compraId: t.compraId ?? null, fechaEscaneo: t.fechaEscaneo ?? null, vendedor: t.vendedor ?? '' })),
    };
  } catch {
    return null;
  }
}

function calcularLibres(d: Datos, cuantos: number): number[] {
  const usados = new Set(d.tickets.map((t) => t.numeroTicket));
  const out: number[] = [];
  // Recorre los números válidos en orden: 501…800, 1001, 1002…
  for (let k = 0; k < d.capacidad && out.length < cuantos; k++) {
    const n = numeroDeIndice(k);
    if (!usados.has(n)) out.push(n);
  }
  return out;
}

function calcularSiguiente(d: Datos): number | null {
  return calcularLibres(d, 1)[0] ?? null;
}

export function TicketsProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Datos>({ tickets: [], capacidad: STOCK_INICIAL });
  const [listo, setListo] = useState(false);
  // Ref con el estado más reciente: las validaciones nunca leen un estado viejo
  const ref = useRef<Datos>(datos);

  const commit = useCallback((d: Datos) => {
    ref.current = d;
    setDatos(d);
  }, []);

  const parchar = useCallback(
    (id: string, patch: Partial<Ticket>) => {
      const d = ref.current;
      const tickets = d.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t));
      commit({ ...d, tickets });
      return tickets.find((t) => t.id === id)!;
    },
    [commit],
  );

  const recargar = useCallback(async () => {
    if (!supabase) return;
    const [tq, cq] = await Promise.all([
      supabase.from('tickets').select('*').order('numero').range(0, 19999),
      supabase.from('config').select('capacidad').eq('id', 1).maybeSingle(),
    ]);
    if (tq.error) throw tq.error;
    commit({
      tickets: ((tq.data ?? []) as TicketRow[]).map(fromRow),
      capacidad: (cq.data?.capacidad as number | undefined) ?? ref.current.capacidad,
    });
  }, [commit]);

  // Carga inicial + sincronización
  useEffect(() => {
    const cache = leerLocal();
    if (cache) commit(cache);

    if (!supabase) {
      setListo(true);
      const onStorage = (e: StorageEvent) => {
        if (e.key !== LS_KEY) return;
        const d = leerLocal();
        if (d) commit(d);
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const programar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        recargar().catch(console.error);
      }, 250);
    };

    recargar()
      .catch(console.error)
      .finally(() => setListo(true));

    const canal = supabase
      .channel('pollada-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, programar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config' }, programar)
      .subscribe();

    const alVolver = () => {
      if (document.visibilityState === 'visible') programar();
    };
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', alVolver);
      void supabase?.removeChannel(canal);
    };
  }, [commit, recargar]);

  // Persistencia local (también como caché offline en modo Supabase)
  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(datos));
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
  }, [datos, listo]);

  const registrar = useCallback(
    async (c: NuevaCompra): Promise<Resultado<Ticket[]>> => {
      const manual = !!c.numeros?.length;
      const intentar = async (intento: number): Promise<Resultado<Ticket[]>> => {
        const d = ref.current;
        let numeros: number[];

        if (manual) {
          numeros = [...new Set(c.numeros)];
          const malos = numeros.filter((n) => !Number.isInteger(n) || n < 1);
          if (malos.length) return fallo('INVALIDO', 'Hay números de ticket no válidos.');
          const fuera = numeros.filter((n) => !enStock(n, d.capacidad));
          if (fuera.length)
            return fallo(
              'FUERA_STOCK',
              `Fuera del stock (N° ${rangoStock(d.capacidad)}): ${fuera.map(fmtNum).join(', ')}. Agrega cupos primero.`,
            );
          const usados = numeros
            .map((n) => d.tickets.find((t) => t.numeroTicket === n))
            .filter((t): t is Ticket => !!t);
          if (usados.length)
            return fallo(
              'DUPLICADO',
              `Ya vendidos: ${usados.map((t) => `N° ${fmtNum(t.numeroTicket)} (${t.comprador})`).join(', ')}.`,
              usados[0],
            );
        } else {
          const cant = c.cantidad ?? 1;
          numeros = calcularLibres(d, cant);
          if (numeros.length === 0)
            return fallo('AGOTADO', 'Se agotaron los tickets. Agrega más cupos desde el Dashboard.');
          if (numeros.length < cant)
            return fallo('AGOTADO', `Solo quedan ${numeros.length} tickets libres. Agrega cupos o baja la cantidad.`);
        }
        if (numeros.length > MAX_POR_COMPRA)
          return fallo('INVALIDO', `Máximo ${MAX_POR_COMPRA} tickets por registro.`);

        numeros.sort((x, y) => x - y);
        const ahora = new Date().toISOString();
        const compraId = c.compraId ?? (numeros.length > 1 ? nuevoId() : null);
        // Cuántos tickets quedan pagados ahora (pago parcial: los primeros N)
        const nPagados = Math.max(0, Math.min(numeros.length, c.pagados ?? (c.estadoPago === 'Pagado' ? numeros.length : 0)));
        const nuevos: Ticket[] = numeros.map((numero, i) => ({
          id: nuevoId(),
          numeroTicket: numero,
          compraId,
          firma: nuevaFirma(),
          comprador: c.comprador.trim().replace(/\s+/g, ' '),
          vendedor: c.vendedor.trim().replace(/\s+/g, ' '),
          telefono: c.telefono.trim(),
          metodoPago: c.metodoPago,
          estadoPago: i < nPagados ? 'Pagado' : 'Pendiente',
          estadoEntrega: 'Pendiente',
          fechaRegistro: ahora,
          fechaPago: i < nPagados ? ahora : null,
          fechaEscaneo: null,
          fechaEntrega: null,
        }));

        if (supabase) {
          // Un solo INSERT con todas las filas: se guardan todas o ninguna
          const { error } = await supabase.from('tickets').insert(nuevos.map(toRow));
          if (error) {
            if (error.code === '23505') {
              await recargar().catch(() => {});
              if (!manual && intento < 3) return intentar(intento + 1);
              return fallo('DUPLICADO', 'Alguno de esos números acaba de registrarse desde otro celular.');
            }
            return fallo('RED', `No se pudo guardar: ${error.message}`);
          }
        }

        const cur = ref.current;
        const ids = new Set(nuevos.map((t) => t.id));
        commit({ ...cur, tickets: [...cur.tickets.filter((x) => !ids.has(x.id)), ...nuevos].sort(porNum) });
        return { ok: true, data: nuevos };
      };
      return intentar(0);
    },
    [commit, recargar],
  );

  const marcarPagado = useCallback(
    async (id: string, metodo: MetodoPago): Promise<Resultado<Ticket>> => {
      const t = ref.current.tickets.find((x) => x.id === id);
      if (!t) return fallo('NO_EXISTE', 'El ticket no existe.');
      const patch: Partial<Ticket> = {
        estadoPago: 'Pagado',
        metodoPago: metodo,
        fechaPago: new Date().toISOString(),
      };
      if (supabase) {
        const { error } = await supabase
          .from('tickets')
          .update({ estado_pago: 'Pagado', metodo_pago: metodo, fecha_pago: patch.fechaPago })
          .eq('id', id);
        if (error) return fallo('RED', `No se pudo guardar: ${error.message}`, t);
      }
      return { ok: true, data: parchar(id, patch) };
    },
    [parchar],
  );

  const quitarPago = useCallback(
    async (id: string): Promise<Resultado<Ticket>> => {
      const t = ref.current.tickets.find((x) => x.id === id);
      if (!t) return fallo('NO_EXISTE', 'El ticket no existe.');
      if (supabase) {
        const { error } = await supabase
          .from('tickets')
          .update({ estado_pago: 'Pendiente', fecha_pago: null })
          .eq('id', id);
        if (error) return fallo('RED', `No se pudo guardar: ${error.message}`, t);
      }
      return { ok: true, data: parchar(id, { estadoPago: 'Pendiente', fechaPago: null }) };
    },
    [parchar],
  );

  /**
   * Cambio de estado atómico: en Supabase solo se aplica si el estado actual sigue
   * siendo el esperado, así dos celulares no pueden procesar el mismo ticket a la vez.
   */
  const transicion = useCallback(
    async (
      t: Ticket,
      desde: Ticket['estadoEntrega'][],
      patch: Partial<Ticket>,
      siYaCambio: CodigoError,
    ): Promise<Resultado<Ticket>> => {
      if (supabase) {
        const fila: Record<string, unknown> = {};
        if (patch.estadoEntrega) fila.estado_entrega = patch.estadoEntrega;
        if ('fechaEscaneo' in patch) fila.fecha_escaneo = patch.fechaEscaneo;
        if ('fechaEntrega' in patch) fila.fecha_entrega = patch.fechaEntrega;
        const { data, error } = await supabase
          .from('tickets')
          .update(fila)
          .eq('id', t.id)
          .in('estado_entrega', desde)
          .select();
        if (error) return fallo('RED', `No se pudo guardar: ${error.message}`, t);
        if (!data || data.length === 0) {
          await recargar().catch(() => {});
          const fresco = ref.current.tickets.find((x) => x.id === t.id) ?? t;
          return fallo(siYaCambio, 'El ticket cambió en otro celular.', fresco);
        }
      }
      return { ok: true, data: parchar(t.id, patch) };
    },
    [parchar, recargar],
  );

  const escanear = useCallback(
    async (id: string): Promise<Resultado<Ticket>> => {
      const t = ref.current.tickets.find((x) => x.id === id);
      if (!t) return fallo('NO_EXISTE', 'El ticket no existe.');
      if (t.estadoEntrega === 'Entregado') return fallo('YA_ENTREGADO', 'Ticket ya canjeado.', t);
      if (t.estadoEntrega === 'PorRecoger') return fallo('YA_ESCANEADO', 'Ticket ya escaneado.', t);
      if (t.estadoPago !== 'Pagado') return fallo('IMPAGO', 'Falta cobrar este ticket.', t);
      return transicion(
        t,
        ['Pendiente'],
        { estadoEntrega: 'PorRecoger', fechaEscaneo: new Date().toISOString() },
        'YA_ESCANEADO',
      );
    },
    [transicion],
  );

  const entregar = useCallback(
    async (id: string): Promise<Resultado<Ticket>> => {
      const t = ref.current.tickets.find((x) => x.id === id);
      if (!t) return fallo('NO_EXISTE', 'El ticket no existe.');
      if (t.estadoEntrega === 'Entregado') return fallo('YA_ENTREGADO', 'Ticket ya canjeado.', t);
      if (t.estadoPago !== 'Pagado') return fallo('IMPAGO', 'Falta cobrar este ticket.', t);
      const ahora = new Date().toISOString();
      return transicion(
        t,
        ['Pendiente', 'PorRecoger'],
        { estadoEntrega: 'Entregado', fechaEntrega: ahora, fechaEscaneo: t.fechaEscaneo ?? ahora },
        'YA_ENTREGADO',
      );
    },
    [transicion],
  );

  const quitarEscaneo = useCallback(
    async (id: string): Promise<Resultado<Ticket>> => {
      const t = ref.current.tickets.find((x) => x.id === id);
      if (!t) return fallo('NO_EXISTE', 'El ticket no existe.');
      if (t.estadoEntrega === 'Pendiente') return { ok: true, data: t };
      return transicion(
        t,
        ['PorRecoger', 'Entregado'],
        { estadoEntrega: 'Pendiente', fechaEscaneo: null, fechaEntrega: null },
        'INVALIDO',
      );
    },
    [transicion],
  );

  const devolverACocina = useCallback(
    async (id: string): Promise<Resultado<Ticket>> => {
      const t = ref.current.tickets.find((x) => x.id === id);
      if (!t) return fallo('NO_EXISTE', 'El ticket no existe.');
      if (t.estadoEntrega !== 'Entregado') return { ok: true, data: t };
      return transicion(t, ['Entregado'], { estadoEntrega: 'PorRecoger', fechaEntrega: null }, 'INVALIDO');
    },
    [transicion],
  );

  const agregarACompra = useCallback(
    async (
      ids: string[],
      extra: Pick<NuevaCompra, 'cantidad' | 'numeros' | 'pagados' | 'metodoPago'>,
    ): Promise<Resultado<Ticket[]>> => {
      const actuales = ref.current.tickets.filter((t) => ids.includes(t.id));
      if (actuales.length === 0) return fallo('NO_EXISTE', 'La compra no existe.');
      const base = actuales[0];
      let compraId = actuales.find((t) => t.compraId)?.compraId ?? null;

      // Si era un solo ticket (sin grupo), se crea el grupo para que todos queden juntos
      if (!compraId) {
        compraId = nuevoId();
        if (supabase) {
          const { error } = await supabase.from('tickets').update({ compra_id: compraId }).in('id', ids);
          if (error) return fallo('RED', `No se pudo guardar: ${error.message}`);
        }
        const d = ref.current;
        commit({ ...d, tickets: d.tickets.map((t) => (ids.includes(t.id) ? { ...t, compraId } : t)) });
      }

      return registrar({
        comprador: base.comprador,
        telefono: base.telefono,
        vendedor: base.vendedor,
        metodoPago: extra.metodoPago,
        estadoPago: 'Pagado',
        pagados: extra.pagados ?? 0,
        cantidad: extra.cantidad,
        numeros: extra.numeros,
        compraId,
      });
    },
    [commit, registrar],
  );

  const editarDatos = useCallback(
    async (ids: string[], datos: { comprador: string; telefono: string; vendedor: string }): Promise<Resultado<null>> => {
      const limpio = {
        comprador: datos.comprador.trim().replace(/\s+/g, ' '),
        telefono: datos.telefono.trim(),
        vendedor: datos.vendedor.trim().replace(/\s+/g, ' '),
      };
      if (limpio.comprador.length < 2) return fallo('INVALIDO', 'Escribe el nombre del comprador.');
      if (ids.length === 0) return fallo('NO_EXISTE', 'No hay tickets para editar.');
      if (supabase) {
        const { error } = await supabase.from('tickets').update(limpio).in('id', ids);
        if (error) return fallo('RED', `No se pudo guardar: ${error.message}`);
      }
      const set = new Set(ids);
      const d = ref.current;
      commit({ ...d, tickets: d.tickets.map((t) => (set.has(t.id) ? { ...t, ...limpio } : t)) });
      return { ok: true, data: null };
    },
    [commit],
  );

  const eliminar = useCallback(
    async (id: string): Promise<Resultado<null>> => {
      if (supabase) {
        const { error } = await supabase.from('tickets').delete().eq('id', id);
        if (error) return fallo('RED', `No se pudo eliminar: ${error.message}`);
      }
      const d = ref.current;
      commit({ ...d, tickets: d.tickets.filter((t) => t.id !== id) });
      return { ok: true, data: null };
    },
    [commit],
  );

  const agregarCupos = useCallback(
    async (n: number): Promise<Resultado<number>> => {
      if (!Number.isInteger(n) || n <= 0) return fallo('INVALIDO', 'Cantidad inválida.');
      const nueva = ref.current.capacidad + n;
      if (supabase) {
        const { error } = await supabase.from('config').upsert({ id: 1, capacidad: nueva });
        if (error) return fallo('RED', `No se pudo guardar: ${error.message}`);
      }
      commit({ ...ref.current, capacidad: nueva });
      return { ok: true, data: nueva };
    },
    [commit],
  );

  const importar = useCallback(
    (entrada: unknown): Resultado<number> => {
      if (supabase) return fallo('INVALIDO', 'La importación solo está disponible en modo local.');
      if (!esDatos(entrada)) return fallo('INVALIDO', 'El archivo no es un respaldo válido.');
      const nums = new Set<number>();
      for (const t of entrada.tickets) {
        if (typeof t?.numeroTicket !== 'number' || nums.has(t.numeroTicket))
          return fallo('INVALIDO', 'El respaldo tiene números repetidos o dañados.');
        nums.add(t.numeroTicket);
      }
      commit({ capacidad: entrada.capacidad, tickets: [...entrada.tickets].sort(porNum) });
      return { ok: true, data: entrada.tickets.length };
    },
    [commit],
  );

  const valor = useMemo<TicketsCtx>(() => {
    const porNumero = new Map(datos.tickets.map((t) => [t.numeroTicket, t]));
    const vendidosEnStock = datos.tickets.filter((t) => enStock(t.numeroTicket, datos.capacidad)).length;
    return {
      ...datos,
      listo,
      modo: supabase ? 'supabase' : 'local',
      porNumero,
      siguiente: calcularSiguiente(datos),
      libres: (n: number) => calcularLibres(datos, n),
      disponibles: Math.max(0, datos.capacidad - vendidosEnStock),
      registrar,
      marcarPagado,
      quitarPago,
      escanear,
      entregar,
      devolverACocina,
      quitarEscaneo,
      eliminar,
      editarDatos,
      agregarACompra,
      agregarCupos,
      importar,
    };
  }, [datos, listo, registrar, marcarPagado, quitarPago, escanear, entregar, devolverACocina, quitarEscaneo, eliminar, editarDatos, agregarACompra, agregarCupos, importar]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useTickets() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTickets debe usarse dentro de <TicketsProvider>');
  return c;
}
