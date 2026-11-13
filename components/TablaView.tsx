'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  Banknote,
  ChefHat,
  MessageCircle,
  PackageCheck,
  Search,
  Smartphone,
  Ticket as TicketIcon,
  Trash2,
} from 'lucide-react';
import { useTickets } from '@/lib/store';
import { PRECIO, fechaHora, fmtNum, horaCorta, normalizar, rangos } from '@/lib/evento';
import { mensajeCompra, waLink } from '@/lib/whatsapp';
import type { Ticket } from '@/lib/types';
import { Boton, Hoja, PillEntrega, PillPago, inputCls } from './ui';
import TicketModal from './TicketModal';

type Filtro = 'todos' | 'por-cobrar' | 'sin-escanear' | 'en-cocina' | 'recibidos';
type Orden = 'recientes' | 'numero';

interface Grupo {
  clave: string;
  tickets: Ticket[];
  comprador: string;
  vendedor: string;
  telefono: string;
  metodo: Ticket['metodoPago'];
  fecha: string;
  primerNumero: number;
}

const POR_PAGINA = 20;

function agrupar(lista: Ticket[]): Grupo[] {
  const m = new Map<string, Ticket[]>();
  for (const t of lista) {
    const k = t.compraId ?? t.id;
    const arr = m.get(k);
    if (arr) arr.push(t);
    else m.set(k, [t]);
  }
  return [...m.entries()].map(([clave, ts]) => {
    ts.sort((a, b) => a.numeroTicket - b.numeroTicket);
    return {
      clave,
      tickets: ts,
      comprador: ts[0].comprador,
      vendedor: ts[0].vendedor,
      telefono: ts[0].telefono,
      metodo: ts[0].metodoPago,
      fecha: ts[0].fechaRegistro,
      primerNumero: ts[0].numeroTicket,
    };
  });
}

export default function TablaView() {
  const { tickets, marcarPagado, escanear, entregar, eliminar } = useTickets();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [orden, setOrden] = useState<Orden>('recientes');
  const [limite, setLimite] = useState(POR_PAGINA);
  const [sel, setSel] = useState<string | null>(null);
  const [ver, setVer] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cobrarN, setCobrarN] = useState(1);
  const [cobrando, setCobrando] = useState(false);

  // Al cambiar búsqueda o filtro vuelve a la primera página
  useEffect(() => setLimite(POR_PAGINA), [q, filtro, orden]);

  const todos = useMemo(() => agrupar(tickets), [tickets]);

  const conteo = useMemo(
    () => ({
      todos: tickets.length,
      'por-cobrar': tickets.filter((t) => t.estadoPago === 'Pendiente').length,
      'sin-escanear': tickets.filter((t) => t.estadoEntrega === 'Pendiente').length,
      'en-cocina': tickets.filter((t) => t.estadoEntrega === 'PorRecoger').length,
      recibidos: tickets.filter((t) => t.estadoEntrega === 'Entregado').length,
    }),
    [tickets],
  );

  const grupos = useMemo(() => {
    const n = normalizar(q);
    const dig = n.replace(/\D/g, '');
    const pasa = (t: Ticket) =>
      filtro === 'todos' ||
      (filtro === 'por-cobrar' && t.estadoPago === 'Pendiente') ||
      (filtro === 'sin-escanear' && t.estadoEntrega === 'Pendiente') ||
      (filtro === 'en-cocina' && t.estadoEntrega === 'PorRecoger') ||
      (filtro === 'recibidos' && t.estadoEntrega === 'Entregado');
    const coincide = (g: Grupo) =>
      !n ||
      normalizar(g.comprador).includes(n) ||
      normalizar(g.vendedor).includes(n) ||
      (dig !== '' &&
        (g.tickets.some((t) => fmtNum(t.numeroTicket).includes(dig) || t.numeroTicket === Number(dig)) ||
          g.telefono.replace(/\D/g, '').includes(dig)));
    const out = todos.filter((g) => g.tickets.some(pasa) && coincide(g));
    out.sort((a, b) => (orden === 'recientes' ? b.fecha.localeCompare(a.fecha) : a.primerNumero - b.primerNumero));
    return out;
  }, [todos, q, filtro, orden]);

  const visibles = grupos.slice(0, limite);
  const g = sel ? todos.find((x) => x.clave === sel) : undefined;

  const FILTROS: { id: Filtro; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'por-cobrar', label: 'Por cobrar' },
    { id: 'sin-escanear', label: 'Sin escanear' },
    { id: 'en-cocina', label: 'En cocina' },
    { id: 'recibidos', label: 'Recibidos' },
  ];

  async function accion(p: Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    const r = await p;
    if (!r.ok) setError(r.error ?? 'Error');
    return r.ok;
  }

  /** Registra el pago de N tickets pendientes de la compra (pago parcial o total) */
  async function cobrar(grupo: Grupo, cuantos: number, m: Ticket['metodoPago']) {
    const pendientes = grupo.tickets.filter((x) => x.estadoPago === 'Pendiente').slice(0, cuantos);
    setCobrando(true);
    for (const t of pendientes) {
      if (!(await accion(marcarPagado(t.id, m)))) break;
    }
    setCobrando(false);
    setCobrarN(1);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Tabla de registros</h1>
          <p className="text-sm text-white/60">
            {tickets.length} tickets · {todos.length} compras
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOrden((o) => (o === 'recientes' ? 'numero' : 'recientes'))}
          className="flex h-10 items-center gap-1.5 rounded-full bg-white/[.07] px-3 text-xs font-bold text-white/80"
          aria-label={`Ordenar por ${orden === 'recientes' ? 'número' : 'más recientes'}`}
        >
          <ArrowDownWideNarrow className="h-4 w-4" aria-hidden />
          {orden === 'recientes' ? 'Recientes' : 'Por N°'}
        </button>
      </div>

      {/* Resumen de entregas: toca una tarjeta para filtrar */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['recibidos', 'Recibidos', 'text-sky-300', 'ring-sky-400/40 bg-sky-500/10'],
            ['en-cocina', 'En cocina', 'text-orange-300', 'ring-orange-400/40 bg-orange-500/10'],
            ['sin-escanear', 'Sin escanear', 'text-white/80', 'ring-white/20 bg-white/[.05]'],
          ] as const
        ).map(([id, label, txt, caja]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFiltro(filtro === id ? 'todos' : id)}
            aria-pressed={filtro === id}
            className={`rounded-2xl p-2.5 text-left ring-1 transition ${caja} ${filtro === id ? 'ring-2 ring-oro' : ''}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">{label}</p>
            <p className={`font-display text-2xl leading-none ${txt}`}>{conteo[id]}</p>
            <p className="text-[11px] tabular-nums text-white/45">de {tickets.length}</p>
          </button>
        ))}
      </div>
      {tickets.length > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div
            className="h-full rounded-full bg-sky-400 transition-[width] duration-500"
            style={{ width: `${(conteo.recibidos / tickets.length) * 100}%` }}
          />
        </div>
      )}

      {/* Buscador y filtros fijos arriba mientras bajas */}
      <div
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}
        className="sticky z-20 -mx-4 space-y-2 bg-noche-950/95 px-4 pb-2 pt-1 backdrop-blur-md">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <input
            className={`${inputCls} pl-12`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por N°, nombre, celular o vendedor"
            aria-label="Buscar tickets"
            enterKeyHint="search"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtros">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-bold ${
                filtro === f.id ? 'bg-oro text-noche-950' : 'bg-white/[.07] text-white/75'
              }`}
            >
              {f.label}
              <span className={`tabular-nums ${filtro === f.id ? 'text-noche-950/70' : 'text-white/45'}`}>
                {conteo[f.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/55">
          <TicketIcon className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden />
          {tickets.length === 0 ? 'Aún no hay ventas. Registra la primera en “Vender”.' : 'Sin resultados.'}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-white/[.07] overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
            {visibles.map((grp) => {
              const pend = grp.tickets.filter((t) => t.estadoPago === 'Pendiente').length;
              const entregados = grp.tickets.filter((t) => t.estadoEntrega === 'Entregado').length;
              const n = grp.tickets.length;
              return (
                <li key={grp.clave}>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setCobrarN(1);
                      setSel(grp.clave);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-white/10"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate font-semibold">{grp.comprador}</span>
                        <span className="shrink-0 text-xs text-white/40">{horaCorta(grp.fecha)}</span>
                      </span>
                      {grp.vendedor && (
                        <span className="block truncate text-xs text-white/45">Vendió: {grp.vendedor}</span>
                      )}
                      <span className="mt-1 flex flex-wrap gap-1">
                        {grp.tickets.slice(0, 6).map((t) => (
                          <span
                            key={t.id}
                            className={`rounded-md px-1.5 py-0.5 font-display text-xs leading-none ${
                              t.estadoEntrega === 'Entregado'
                                ? 'bg-sky-500/15 text-sky-300'
                                : t.estadoEntrega === 'PorRecoger'
                                  ? 'bg-orange-500/20 text-orange-300'
                                  : t.estadoPago === 'Pendiente'
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : 'bg-oro/15 text-oro'
                            }`}
                          >
                            {fmtNum(t.numeroTicket)}
                          </span>
                        ))}
                        {n > 6 && <span className="text-xs text-white/50">+{n - 6}</span>}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-bold tabular-nums">
                        {n > 1 ? `${n} × ` : ''}S/ {n * PRECIO}
                      </span>
                      {pend > 0 && pend < n ? (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
                          Falta S/ {pend * PRECIO}
                        </span>
                      ) : pend > 0 ? (
                        <PillPago estado="Pendiente" />
                      ) : entregados === n ? (
                        <PillEntrega estado="Entregado" />
                      ) : (
                        <span className="text-[11px] font-semibold text-white/50">
                          {entregados}/{n} recibidas
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between text-sm text-white/55">
            <span>
              Mostrando {visibles.length} de {grupos.length}
            </span>
            {visibles.length < grupos.length && (
              <Boton variante="suave" className="!min-h-10" onClick={() => setLimite((l) => l + POR_PAGINA)}>
                Ver {Math.min(POR_PAGINA, grupos.length - visibles.length)} más
              </Boton>
            )}
          </div>
        </>
      )}

      {g && (
        <Hoja
          titulo={g.tickets.length > 1 ? `${g.comprador} · ${g.tickets.length} tickets` : `Ticket N° ${fmtNum(g.primerNumero)}`}
          onClose={() => setSel(null)}
        >
          <dl className="mb-3 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-white/50">Comprador</dt>
            <dd className="font-semibold">{g.comprador}</dd>
            <dt className="text-white/50">Vendedor</dt>
            <dd>{g.vendedor || '—'}</dd>
            <dt className="text-white/50">Celular</dt>
            <dd>{g.telefono}</dd>
            <dt className="text-white/50">Total</dt>
            <dd>S/ {g.tickets.length * PRECIO}</dd>
            <dt className="text-white/50">Registrado</dt>
            <dd>{fechaHora(g.fecha)}</dd>
          </dl>

          {error && <p className="mb-3 rounded-lg bg-red-500/15 p-2 text-sm text-red-200">{error}</p>}

          {(() => {
            const total = g.tickets.length;
            const pend = g.tickets.filter((t) => t.estadoPago === 'Pendiente').length;
            const pag = total - pend;
            const n = Math.max(1, Math.min(cobrarN, pend));
            return (
              <div className="mb-3 space-y-3 rounded-2xl border border-white/10 bg-white/[.04] p-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-white/50">Total</p>
                    <p className="font-extrabold tabular-nums">S/ {total * PRECIO}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-emerald-300/80">Pagado</p>
                    <p className="font-extrabold tabular-nums text-emerald-300">S/ {pag * PRECIO}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-amber-300/80">Falta</p>
                    <p className={`font-extrabold tabular-nums ${pend ? 'text-amber-300' : 'text-white/40'}`}>
                      S/ {pend * PRECIO}
                    </p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(pag / total) * 100}%` }} />
                </div>

                {pend === 0 ? (
                  <p className="text-center text-sm font-semibold text-emerald-300">✅ Todo pagado</p>
                ) : (
                  <>
                    {pend > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-sm text-white/75">¿Cuántos paga ahora?</span>
                        <button
                          type="button"
                          aria-label="Uno menos"
                          onClick={() => setCobrarN(Math.max(1, n - 1))}
                          disabled={n <= 1}
                          className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-lg font-bold disabled:opacity-30"
                        >
                          −
                        </button>
                        <output className="w-16 text-center font-extrabold tabular-nums">
                          {n} de {pend}
                        </output>
                        <button
                          type="button"
                          aria-label="Uno más"
                          onClick={() => setCobrarN(Math.min(pend, n + 1))}
                          disabled={n >= pend}
                          className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-lg font-bold disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Boton variante="borde" disabled={cobrando} onClick={() => cobrar(g, n, 'Yape')}>
                        <Smartphone className="h-5 w-5" aria-hidden /> S/ {n * PRECIO} Yape/Plin
                      </Boton>
                      <Boton variante="borde" disabled={cobrando} onClick={() => cobrar(g, n, 'Efectivo')}>
                        <Banknote className="h-5 w-5" aria-hidden /> S/ {n * PRECIO} Efectivo
                      </Boton>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          <ul className="mb-3 divide-y divide-white/[.07] rounded-xl border border-white/10">
            {g.tickets.map((t) => (
              <li key={t.id} className="flex items-center gap-2 px-3 py-2">
                <span className="w-14 shrink-0 font-display text-lg text-oro">{fmtNum(t.numeroTicket)}</span>
                <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                  <PillPago estado={t.estadoPago} />
                  <PillEntrega estado={t.estadoEntrega} />
                  {(t.fechaEntrega ?? t.fechaEscaneo) && (
                    <span className="text-xs text-white/45">{horaCorta(t.fechaEntrega ?? t.fechaEscaneo)}</span>
                  )}
                </span>
                {t.estadoPago === 'Pagado' && t.estadoEntrega === 'Pendiente' && (
                  <button
                    type="button"
                    onClick={() => accion(escanear(t.id))}
                    aria-label={`Enviar N° ${fmtNum(t.numeroTicket)} a cocina`}
                    className="grid h-10 w-10 place-items-center rounded-lg bg-orange-500/15 text-orange-300"
                  >
                    <ChefHat className="h-5 w-5" aria-hidden />
                  </button>
                )}
                {t.estadoEntrega === 'PorRecoger' && (
                  <button
                    type="button"
                    onClick={() => accion(entregar(t.id))}
                    aria-label={`Marcar N° ${fmtNum(t.numeroTicket)} como recibido`}
                    className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/15 text-sky-300"
                  >
                    <PackageCheck className="h-5 w-5" aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`¿Anular el ticket N° ${fmtNum(t.numeroTicket)}? El número quedará libre.`)) {
                      void accion(eliminar(t.id)).then((ok) => ok && g.tickets.length === 1 && setSel(null));
                    }
                  }}
                  aria-label={`Anular N° ${fmtNum(t.numeroTicket)}`}
                  className="grid h-10 w-10 place-items-center rounded-lg bg-red-500/10 text-red-300"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <Boton className="w-full" onClick={() => setVer(g.tickets.map((t) => t.id))}>
              <TicketIcon className="h-5 w-5" aria-hidden />
              {g.tickets.length > 1 ? `Ver / enviar los ${g.tickets.length} tickets` : 'Ver / enviar ticket'}
            </Boton>
            <Boton
              variante="suave"
              className="w-full"
              onClick={() => window.open(waLink(g.telefono, mensajeCompra(g.tickets)), '_blank', 'noopener')}
            >
              <MessageCircle className="h-5 w-5" aria-hidden /> Escribir por WhatsApp
            </Boton>
            {g.tickets.length > 1 && (
              <p className="text-center text-xs text-white/45">N° {rangos(g.tickets.map((t) => t.numeroTicket))}</p>
            )}
          </div>
        </Hoja>
      )}

      {ver && <TicketModal ticketIds={ver} onClose={() => setVer(null)} />}
    </div>
  );
}
