'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChefHat, CircleCheck, Hourglass, RotateCcw, Undo2, UtensilsCrossed } from 'lucide-react';
import { useTickets } from '@/lib/store';
import { fmtNum, horaCorta } from '@/lib/evento';
import { desbloquearAudio, sonidoNuevoPedido, sonidoValido } from '@/lib/sonido';
import type { Ticket } from '@/lib/types';

interface Pedido {
  clave: string;
  comprador: string;
  tickets: Ticket[];
  desde: string;
  /** Tickets de la misma compra que aún no se escanean */
  faltan: number;
}

const POR_PAGINA = 25;

function hace(iso: string | null, ahora: number) {
  if (!iso) return '';
  const min = Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.floor(min / 60)} h ${min % 60} min`;
}

export default function CocinaView() {
  const { tickets, entregar, devolverACocina, quitarEscaneo } = useTickets();
  const [tab, setTab] = useState<'cola' | 'recibidos'>('cola');
  const [armado, setArmado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limite, setLimite] = useState(POR_PAGINA);
  const [ahora, setAhora] = useState(() => Date.now());

  // Reloj para "hace X min"
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Pedidos en cola (escaneados, por recoger), primero el que llegó antes
  const cola = useMemo<Pedido[]>(() => {
    const grupos = new Map<string, Ticket[]>();
    for (const t of tickets) {
      if (t.estadoEntrega !== 'PorRecoger') continue;
      const k = t.compraId ?? t.id;
      const arr = grupos.get(k);
      if (arr) arr.push(t);
      else grupos.set(k, [t]);
    }
    return [...grupos.entries()]
      .map(([clave, ts]) => {
        ts.sort((a, b) => a.numeroTicket - b.numeroTicket);
        const desde = ts.reduce((m, t) => (t.fechaEscaneo && t.fechaEscaneo < m ? t.fechaEscaneo : m), ts[0].fechaEscaneo ?? '');
        const faltan = ts[0].compraId
          ? tickets.filter((x) => x.compraId === ts[0].compraId && x.estadoEntrega === 'Pendiente').length
          : 0;
        return { clave, comprador: ts[0].comprador, tickets: ts, desde, faltan };
      })
      .sort((a, b) => a.desde.localeCompare(b.desde));
  }, [tickets]);

  const recibidos = useMemo(
    () =>
      tickets
        .filter((t) => t.estadoEntrega === 'Entregado')
        .sort((a, b) => (b.fechaEntrega ?? '').localeCompare(a.fechaEntrega ?? '')),
    [tickets],
  );

  const polladasEnCola = cola.reduce((n, p) => n + p.tickets.length, 0);

  // Suena cuando entra un pedido nuevo a la cola
  const previo = useRef<number | null>(null);
  useEffect(() => {
    if (previo.current != null && polladasEnCola > previo.current) sonidoNuevoPedido();
    previo.current = polladasEnCola;
  }, [polladasEnCola]);

  // El botón "armado" (confirmación) se desarma solo
  useEffect(() => {
    if (!armado) return;
    const id = setTimeout(() => setArmado(null), 4000);
    return () => clearTimeout(id);
  }, [armado]);

  useEffect(() => setLimite(POR_PAGINA), [tab]);

  async function entregarPedido(p: Pedido) {
    desbloquearAudio();
    if (armado !== p.clave) {
      setArmado(p.clave);
      return;
    }
    setArmado(null);
    setOcupado(p.clave);
    setError(null);
    for (const t of p.tickets) {
      const r = await entregar(t.id);
      if (!r.ok && r.code !== 'YA_ENTREGADO') {
        setError(r.error);
        break;
      }
    }
    setOcupado(null);
    sonidoValido();
  }

  /** Se escaneó por error: los tickets vuelven a "Sin escanear" y salen de cocina */
  async function sacarDeCocina(ts: Ticket[]) {
    const nums = ts.map((t) => fmtNum(t.numeroTicket)).join(', ');
    if (!confirm(`¿${ts[0].comprador} aún no escanea? El N° ${nums} volverá a "Sin escanear" y saldrá de cocina.`)) return;
    setError(null);
    for (const t of ts) {
      const r = await quitarEscaneo(t.id);
      if (!r.ok) {
        setError(r.error);
        break;
      }
    }
  }

  async function deshacer(t: Ticket) {
    if (!confirm(`¿Devolver el N° ${fmtNum(t.numeroTicket)} (${t.comprador}) a la cola de cocina?`)) return;
    const r = await devolverACocina(t.id);
    if (!r.ok) setError(r.error);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <ChefHat className="h-6 w-6 text-oro" aria-hidden /> Cocina
        </h1>
        <p className="text-sm text-white/60">Llama por su nombre, entrega y marca como recibido.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-orange-400/30 bg-orange-500/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-orange-200/80">
            <Hourglass className="h-3.5 w-3.5" aria-hidden /> Por entregar
          </p>
          <p className="font-display text-3xl leading-none text-orange-200">{polladasEnCola}</p>
          <p className="text-xs text-orange-100/60">{cola.length} personas</p>
        </div>
        <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-200/80">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden /> Recibidas
          </p>
          <p className="font-display text-3xl leading-none text-sky-200">{recibidos.length}</p>
          <p className="text-xs text-sky-100/60">polladas entregadas</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[.06] p-1" role="tablist">
        {(
          [
            ['cola', `Por entregar (${polladasEnCola})`],
            ['recibidos', `Recibidos (${recibidos.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`h-11 rounded-lg text-sm font-bold ${tab === id ? 'bg-oro text-noche-950' : 'text-white/70'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}

      {tab === 'cola' &&
        (cola.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/55">
            <UtensilsCrossed className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden />
            No hay pedidos en espera. Aparecen aquí cuando se escanea un ticket pagado.
          </div>
        ) : (
          <ol className="space-y-3">
            {cola.slice(0, limite).map((p, i) => {
              const n = p.tickets.length;
              const arm = armado === p.clave;
              return (
                <li
                  key={p.clave}
                  className={`overflow-hidden rounded-2xl border bg-noche-800/80 ${
                    i === 0 ? 'border-oro/60 shadow-lg shadow-oro/10' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3 p-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-oro font-display text-2xl text-noche-950">
                      {n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-2xl font-extrabold leading-tight">{p.comprador}</p>
                      <p className="text-sm text-white/60">
                        {n} {n === 1 ? 'pollada' : 'polladas'} · {hace(p.desde, ahora)} ({horaCorta(p.desde)})
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.tickets.map((t) => (
                          <span
                            key={t.id}
                            className="rounded-md bg-oro/15 px-2 py-0.5 font-display text-sm text-oro ring-1 ring-oro/30"
                          >
                            N° {fmtNum(t.numeroTicket)}
                          </span>
                        ))}
                      </div>
                      {p.faltan > 0 && (
                        <p className="mt-2 text-xs text-white/50">
                          + {p.faltan} ticket{p.faltan > 1 ? 's' : ''} de la misma compra aún sin escanear
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => entregarPedido(p)}
                    disabled={ocupado === p.clave}
                    className={`flex min-h-14 w-full items-center justify-center gap-2 text-base font-extrabold transition-colors disabled:opacity-50 ${
                      arm ? 'bg-emerald-400 text-noche-950' : 'bg-emerald-600 text-white active:bg-emerald-700'
                    }`}
                  >
                    <CircleCheck className="h-5 w-5" aria-hidden />
                    {ocupado === p.clave
                      ? 'Guardando…'
                      : arm
                        ? `Toca otra vez: ${p.comprador.split(' ')[0]} recibió ${n === 1 ? 'su pollada' : `sus ${n}`}`
                        : `Entregar ${n === 1 ? '' : `${n} `}· marcar recibido`}
                  </button>
                  <button
                    type="button"
                    onClick={() => sacarDeCocina(p.tickets)}
                    disabled={ocupado === p.clave}
                    className="flex min-h-10 w-full items-center justify-center gap-1.5 bg-noche-900/60 text-xs font-semibold text-white/55 active:bg-white/5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Aún no escanea · quitar de cocina
                  </button>
                </li>
              );
            })}
          </ol>
        ))}

      {tab === 'recibidos' &&
        (recibidos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/55">
            Aún no se ha entregado ninguna pollada.
          </div>
        ) : (
          <ul className="divide-y divide-white/[.07] overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
            {recibidos.slice(0, limite).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                <CircleCheck className="h-5 w-5 shrink-0 text-sky-300" aria-hidden />
                <span className="w-12 shrink-0 font-display text-oro">{fmtNum(t.numeroTicket)}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{t.comprador}</span>
                <span className="text-xs tabular-nums text-white/45">{horaCorta(t.fechaEntrega)}</span>
                <button
                  type="button"
                  onClick={() => deshacer(t)}
                  aria-label={`Devolver el N° ${fmtNum(t.numeroTicket)} a la cola de cocina`}
                  className="flex h-9 items-center gap-1 rounded-lg bg-white/[.06] px-2 text-xs font-semibold text-white/70"
                >
                  <Undo2 className="h-3.5 w-3.5" aria-hidden /> Cocina
                </button>
                <button
                  type="button"
                  onClick={() => sacarDeCocina([t])}
                  aria-label={`Volver el N° ${fmtNum(t.numeroTicket)} a sin escanear`}
                  className="flex h-9 items-center gap-1 rounded-lg bg-amber-500/10 px-2 text-xs font-semibold text-amber-300"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Sin escanear
                </button>
              </li>
            ))}
          </ul>
        ))}

      {(tab === 'cola' ? cola.length : recibidos.length) > limite && (
        <button
          type="button"
          onClick={() => setLimite((l) => l + POR_PAGINA)}
          className="h-11 w-full rounded-xl bg-white/[.07] text-sm font-bold"
        >
          Ver más
        </button>
      )}
    </div>
  );
}
