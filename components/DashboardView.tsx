'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Banknote,
  ChevronDown,
  ChefHat,
  Coins,
  FileJson,
  FileSpreadsheet,
  Hourglass,
  PackageCheck,
  Plus,
  Smartphone,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';
import { useTickets } from '@/lib/store';
import { PRECIO, fmtNum, numeroDeIndice, rangoStock, rangos, soles, ultimoNumero } from '@/lib/evento';
import { exportarCSV, exportarJSON } from '@/lib/exportar';
import { Boton, Tarjeta } from './ui';

function Barra({ valor, total, color }: { valor: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
  return (
    <div
      className="h-3 w-full overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={valor}
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Cifra({
  Icon,
  titulo,
  valor,
  sub,
  tono,
}: {
  Icon: typeof Wallet;
  titulo: string;
  valor: ReactNode;
  sub?: string;
  tono: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-noche-800/70 p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${tono}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-white/55">{titulo}</span>
      </div>
      <p className="text-xl font-extrabold tabular-nums">{valor}</p>
      {sub && <p className="text-xs text-white/50">{sub}</p>}
    </div>
  );
}

export default function DashboardView() {
  const { tickets, capacidad, siguiente, agregarCupos, importar, modo } = useTickets();
  const archivo = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const s = useMemo(() => {
    const pagados = tickets.filter((t) => t.estadoPago === 'Pagado');
    const pendientes = tickets.filter((t) => t.estadoPago === 'Pendiente');
    const yape = pagados.filter((t) => t.metodoPago === 'Yape').length;
    const efectivo = pagados.length - yape;
    const entregados = tickets.filter((t) => t.estadoEntrega === 'Entregado').length;
    const enCocina = tickets.filter((t) => t.estadoEntrega === 'PorRecoger').length;
    return {
      vendidos: tickets.length,
      yape,
      efectivo,
      pagados: pagados.length,
      pendientes: pendientes.length,
      pendYape: pendientes.filter((t) => t.metodoPago === 'Yape').length,
      pendEfectivo: pendientes.filter((t) => t.metodoPago === 'Efectivo').length,
      entregados,
      enCocina,
      sinEscanear: tickets.length - entregados - enCocina,
    };
  }, [tickets]);

  // Cuenta por vendedor: tickets, cobros, entregas y lista de compradores
  const porVendedor = useMemo(() => {
    type Comprador = { clave: string; nombre: string; nums: number[]; recibidos: number; pendientesPago: number };
    const m = new Map<
      string,
      {
        tickets: number;
        yape: number;
        efectivo: number;
        pendientes: number;
        entregados: number;
        enCocina: number;
        compradores: Map<string, Comprador>;
      }
    >();
    for (const t of tickets) {
      const k = t.vendedor?.trim() || 'Sin vendedor';
      const v = m.get(k) ?? {
        tickets: 0,
        yape: 0,
        efectivo: 0,
        pendientes: 0,
        entregados: 0,
        enCocina: 0,
        compradores: new Map<string, Comprador>(),
      };
      v.tickets++;
      if (t.estadoPago === 'Pendiente') v.pendientes++;
      else if (t.metodoPago === 'Yape') v.yape++;
      else v.efectivo++;
      if (t.estadoEntrega === 'Entregado') v.entregados++;
      else if (t.estadoEntrega === 'PorRecoger') v.enCocina++;
      const ck = t.compraId ?? t.id;
      const c = v.compradores.get(ck) ?? { clave: ck, nombre: t.comprador, nums: [], recibidos: 0, pendientesPago: 0 };
      c.nums.push(t.numeroTicket);
      if (t.estadoEntrega === 'Entregado') c.recibidos++;
      if (t.estadoPago === 'Pendiente') c.pendientesPago++;
      v.compradores.set(ck, c);
      m.set(k, v);
    }
    return [...m.entries()]
      .map(([nombre, v]) => ({
        nombre,
        ...v,
        faltan: v.tickets - v.entregados,
        compradores: [...v.compradores.values()]
          .map((c) => ({ ...c, nums: c.nums.sort((x, y) => x - y) }))
          .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es')),
      }))
      .sort((a, b) => b.tickets - a.tickets);
  }, [tickets]);
  const [abierto, setAbierto] = useState<string | null>(null);

  const pct = capacidad ? Math.round((s.vendidos / capacidad) * 100) : 0;

  async function cupos(n: number) {
    if (!confirm(`¿Agregar ${n} cupos? El stock pasará de ${capacidad} a ${capacidad + n} (hasta el N° ${fmtNum(ultimoNumero(capacidad + n))}).`))
      return;
    const r = await agregarCupos(n);
    setMsg(r.ok ? `Listo: ahora hay ${r.data} cupos.` : r.error);
  }

  async function restaurar(f: File) {
    try {
      const datos: unknown = JSON.parse(await f.text());
      if (!confirm('Esto reemplazará los registros de este celular por los del respaldo. ¿Continuar?')) return;
      const r = importar(datos);
      setMsg(r.ok ? `Respaldo restaurado: ${r.data} tickets.` : r.error);
    } catch {
      setMsg('El archivo no es un JSON válido.');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-white/60">Caja y cocina en tiempo real</p>
      </div>

      {/* Progreso general */}
      <Tarjeta className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Polladas vendidas</p>
            <p className="font-display text-4xl leading-none text-oro">
              {s.vendidos}
              <span className="text-xl text-white/50"> / {capacidad}</span>
            </p>
          </div>
          <span className="text-2xl font-extrabold tabular-nums">{pct}%</span>
        </div>
        <Barra valor={s.vendidos} total={capacidad} color="bg-gradient-to-r from-oro to-orange-500" />
        <p className="text-xs text-white/50">
          {capacidad - s.vendidos > 0 ? `Quedan ${capacidad - s.vendidos} tickets` : 'Stock completo'} · siguiente{' '}
          {siguiente != null ? `N° ${fmtNum(siguiente)}` : '—'}
        </p>
      </Tarjeta>

      {/* Caja */}
      <section aria-labelledby="caja" className="space-y-2">
        <h2 id="caja" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/55">
          <Wallet className="h-4 w-4" aria-hidden /> Caja
        </h2>
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">Total cobrado</p>
          <p className="text-3xl font-extrabold tabular-nums text-emerald-200">{soles(s.pagados * PRECIO)}</p>
          <p className="text-xs text-emerald-100/60">{s.pagados} tickets pagados</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Cifra
            Icon={Smartphone}
            titulo="Yape / Plin"
            valor={soles(s.yape * PRECIO)}
            sub={`${s.yape} tickets`}
            tono="bg-sky-500/20 text-sky-200"
          />
          <Cifra
            Icon={Banknote}
            titulo="Efectivo"
            valor={soles(s.efectivo * PRECIO)}
            sub={`${s.efectivo} tickets`}
            tono="bg-emerald-500/20 text-emerald-200"
          />
        </div>
        <Cifra
          Icon={Coins}
          titulo="Por cobrar (pendientes)"
          valor={soles(s.pendientes * PRECIO)}
          sub={`${s.pendientes} tickets · ${s.pendYape} por Yape, ${s.pendEfectivo} en efectivo`}
          tono="bg-amber-500/20 text-amber-200"
        />
      </section>

      {/* Por vendedor */}
      <section aria-labelledby="vendedores" className="space-y-2">
        <h2 id="vendedores" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/55">
          <Users className="h-4 w-4" aria-hidden /> Por vendedor
        </h2>
        {porVendedor.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-sm text-white/50">
            Aún no hay ventas.
          </p>
        ) : (
          <ul className="space-y-2">
            {porVendedor.map((v, i) => {
              const cobrado = (v.yape + v.efectivo) * PRECIO;
              const open = abierto === v.nombre;
              return (
                <li key={v.nombre} className="overflow-hidden rounded-2xl border border-white/10 bg-noche-800/70">
                  <button
                    type="button"
                    onClick={() => setAbierto(open ? null : v.nombre)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-white/5"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-base ${
                        i === 0 ? 'bg-oro text-noche-950' : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{v.nombre}</p>
                      <p className="text-xs text-white/50">
                        {v.compradores.length} compradores · Cobrado {soles(cobrado)}
                        {v.pendientes > 0 && <span className="text-amber-300"> · Por cobrar {soles(v.pendientes * PRECIO)}</span>}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-xl leading-none text-oro">{v.tickets}</p>
                      <p className="text-[11px] text-white/50">vendidas</p>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>

                  {/* Contador de entregas */}
                  <div className="grid grid-cols-3 gap-px border-t border-white/[.07] bg-white/[.07] text-center">
                    <div className="bg-noche-800 py-2">
                      <p className="font-display text-lg leading-none text-sky-300">{v.entregados}</p>
                      <p className="text-[11px] text-white/50">Entregó</p>
                    </div>
                    <div className="bg-noche-800 py-2">
                      <p className="font-display text-lg leading-none text-orange-300">{v.enCocina}</p>
                      <p className="text-[11px] text-white/50">En cocina</p>
                    </div>
                    <div className="bg-noche-800 py-2">
                      <p className={`font-display text-lg leading-none ${v.faltan ? 'text-amber-300' : 'text-white/40'}`}>{v.faltan}</p>
                      <p className="text-[11px] text-white/50">Faltan entregar</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/10" aria-hidden>
                    <div className="h-full bg-sky-400" style={{ width: `${(v.entregados / v.tickets) * 100}%` }} />
                  </div>

                  {open && (
                    <ul className="divide-y divide-white/[.07] border-t border-white/[.07]">
                      {v.compradores.map((c) => {
                        const n = c.nums.length;
                        const listo = c.recibidos === n;
                        return (
                          <li key={c.clave} className="flex items-center gap-3 px-3.5 py-2.5">
                            <span
                              className={`h-2.5 w-2.5 shrink-0 rounded-full ${listo ? 'bg-sky-400' : c.recibidos ? 'bg-orange-400' : 'bg-white/25'}`}
                              aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{c.nombre}</p>
                              <p className="truncate text-xs text-white/45">N° {rangos(c.nums)}</p>
                            </div>
                            <div className="shrink-0 text-right text-xs">
                              <p className={listo ? 'font-semibold text-sky-300' : 'text-white/70'}>
                                {listo ? 'Recibió todo' : `Recibió ${c.recibidos} de ${n}`}
                              </p>
                              {c.pendientesPago > 0 && (
                                <p className="text-amber-300">Debe {soles(c.pendientesPago * PRECIO)}</p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Cocina */}
      <section aria-labelledby="cocina" className="space-y-2">
        <h2 id="cocina" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/55">
          <ChefHat className="h-4 w-4" aria-hidden /> Cocina
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <Cifra Icon={PackageCheck} titulo="Recibidas" valor={s.entregados} tono="bg-sky-500/20 text-sky-200" />
          <Cifra Icon={ChefHat} titulo="En cocina" valor={s.enCocina} tono="bg-orange-500/20 text-orange-200" />
          <Cifra Icon={Hourglass} titulo="Sin escanear" valor={s.sinEscanear} tono="bg-white/10 text-white/80" />
        </div>
        <Barra valor={s.entregados} total={s.vendidos} color="bg-sky-400" />
      </section>

      {/* Cupos */}
      <Tarjeta className="space-y-3">
        <div>
          <h2 className="font-bold">Agregar cupos</h2>
          <p className="text-sm text-white/55">
            Números válidos ahora: N° {rangoStock(capacidad)}. Continúa desde el N° {fmtNum(numeroDeIndice(capacidad))}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Boton variante="borde" onClick={() => cupos(50)}>
            <Plus className="h-4 w-4" aria-hidden /> 50 cupos
          </Boton>
          <Boton variante="borde" onClick={() => cupos(100)}>
            <Plus className="h-4 w-4" aria-hidden /> 100 cupos
          </Boton>
        </div>
      </Tarjeta>

      {/* Respaldo */}
      <Tarjeta className="space-y-3">
        <div>
          <h2 className="font-bold">Respaldo</h2>
          <p className="text-sm text-white/55">Descarga el registro completo para Excel o para guardarlo.</p>
        </div>
        <Boton className="w-full" onClick={() => exportarCSV(tickets)} disabled={tickets.length === 0}>
          <FileSpreadsheet className="h-5 w-5" aria-hidden /> Exportar a Excel (CSV)
        </Boton>
        <div className="grid grid-cols-2 gap-2">
          <Boton variante="suave" onClick={() => exportarJSON({ tickets, capacidad })}>
            <FileJson className="h-5 w-5" aria-hidden /> Respaldo
          </Boton>
          <Boton variante="suave" onClick={() => archivo.current?.click()} disabled={modo !== 'local'}>
            <Upload className="h-5 w-5" aria-hidden /> Restaurar
          </Boton>
        </div>
        <input
          ref={archivo}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void restaurar(f);
            e.target.value = '';
          }}
        />
        {modo !== 'local' && (
          <p className="text-xs text-white/45">Con sincronización en la nube, restaurar se hace desde Supabase.</p>
        )}
      </Tarjeta>

      {msg && (
        <p role="status" className="rounded-xl bg-white/10 p-3 text-sm">
          {msg}
        </p>
      )}
    </div>
  );
}
