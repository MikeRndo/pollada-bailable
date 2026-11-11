'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Banknote,
  ChefHat,
  Coins,
  FileJson,
  FileSpreadsheet,
  Hourglass,
  PackageCheck,
  Plus,
  Smartphone,
  Upload,
  Wallet,
} from 'lucide-react';
import { useTickets } from '@/lib/store';
import { PRECIO, fmtNum, soles } from '@/lib/evento';
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

  const pct = capacidad ? Math.round((s.vendidos / capacidad) * 100) : 0;

  async function cupos(n: number) {
    if (!confirm(`¿Agregar ${n} cupos? El stock pasará de ${capacidad} a ${capacidad + n} (hasta el N° ${fmtNum(capacidad + n)}).`))
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
            titulo="Yape"
            valor={soles(s.yape * PRECIO)}
            sub={`${s.yape} tickets`}
            tono="bg-[#7b2cbf]/30 text-purple-200"
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
            Continúa la numeración desde el N° {fmtNum(capacidad + 1)}.
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
