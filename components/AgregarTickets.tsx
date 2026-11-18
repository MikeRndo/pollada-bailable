'use client';

import { useMemo, useState } from 'react';
import { Banknote, CircleCheck, Clock3, Hash, ListOrdered, Minus, Plus, Smartphone } from 'lucide-react';
import { useTickets } from '@/lib/store';
import { PRECIO, fmtNum, parseNumeros, rangos } from '@/lib/evento';
import { sonidoError, sonidoVenta } from '@/lib/sonido';
import type { MetodoPago, Ticket } from '@/lib/types';
import { Boton, Segmentado, inputCls } from './ui';

/** Suma tickets a una compra ya registrada (ej. registré 1 pero eran 2) */
export default function AgregarTickets({
  compra,
  onListo,
  onCancelar,
}: {
  compra: Ticket[];
  onListo: (todos: string[]) => void;
  onCancelar: () => void;
}) {
  const { libres, porNumero, agregarACompra } = useTickets();
  const [modo, setModo] = useState<'auto' | 'manual'>('auto');
  const [cantidad, setCantidad] = useState(1);
  const [manual, setManual] = useState('');
  const [pago, setPago] = useState<'Pagado' | 'Pendiente'>('Pagado');
  const [metodo, setMetodo] = useState<MetodoPago>(compra[0]?.metodoPago ?? 'Yape');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const auto = useMemo(() => libres(cantidad), [libres, cantidad]);
  const man = useMemo(() => {
    if (modo !== 'manual' || !manual.trim()) return null;
    const { nums, error: e } = parseNumeros(manual);
    if (e) return { nums, error: e };
    const ocupado = nums.find((n) => porNumero.has(n));
    if (ocupado) return { nums, error: `N° ${fmtNum(ocupado)} ya es de ${porNumero.get(ocupado)!.comprador}` };
    return { nums, error: null };
  }, [modo, manual, porNumero]);

  const numeros = modo === 'auto' ? (auto.length === cantidad ? auto : []) : man && !man.error ? man.nums : [];

  async function guardar() {
    if (!numeros.length) return;
    setGuardando(true);
    setError(null);
    const r = await agregarACompra(
      compra.map((t) => t.id),
      {
        metodoPago: metodo,
        pagados: pago === 'Pagado' ? numeros.length : 0,
        ...(modo === 'auto' ? { cantidad } : { numeros }),
      },
    );
    setGuardando(false);
    if (r.ok) {
      sonidoVenta();
      onListo([...compra.map((t) => t.id), ...r.data.map((t) => t.id)]);
    } else {
      sonidoError();
      setError(r.error);
    }
  }

  return (
    <div className="mb-3 space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/5 p-3">
      <p className="text-sm font-semibold text-emerald-200">
        Agregar tickets a {compra[0]?.comprador} (tiene {compra.length})
      </p>

      <Segmentado
        label="Número"
        value={modo}
        onChange={setModo}
        opciones={[
          { value: 'auto', label: 'Siguientes', Icon: ListOrdered },
          { value: 'manual', label: 'Manual', Icon: Hash },
        ]}
      />

      {modo === 'auto' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Uno menos"
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              disabled={cantidad <= 1}
              className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 disabled:opacity-30"
            >
              <Minus className="h-5 w-5" aria-hidden />
            </button>
            <output className="grid h-12 flex-1 place-items-center rounded-xl bg-oro/10 font-display text-2xl text-oro ring-1 ring-oro/40">
              +{cantidad}
            </output>
            <button
              type="button"
              aria-label="Uno más"
              onClick={() => setCantidad((c) => Math.min(10, c + 1))}
              disabled={cantidad >= 10}
              className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 disabled:opacity-30"
            >
              <Plus className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <p className="text-sm text-white/65">
            {auto.length < cantidad ? (
              <span className="text-amber-300">No quedan suficientes tickets libres.</span>
            ) : (
              <>
                Se asignará{cantidad > 1 ? 'n' : ''}: <strong className="text-oro">N° {rangos(auto)}</strong>
              </>
            )}
          </p>
        </div>
      ) : (
        <div>
          <input
            className={`${inputCls} font-display tracking-wider`}
            value={manual}
            onChange={(e) => setManual(e.target.value.replace(/[^\d,\s\-–;]/g, ''))}
            placeholder="Ej. 545   ó   545, 546"
            aria-label="Números de los tickets físicos"
            autoComplete="off"
          />
          {man && (
            <p className={`mt-1.5 text-sm ${man.error ? 'text-red-300' : 'text-emerald-300'}`}>
              {man.error ?? `N° ${rangos(man.nums)} disponible${man.nums.length > 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      )}

      <Segmentado
        label="Pago de los nuevos"
        value={pago}
        onChange={setPago}
        opciones={[
          { value: 'Pagado', label: 'Pagado', Icon: CircleCheck, activo: 'border-emerald-500 bg-emerald-500/20 text-emerald-200' },
          { value: 'Pendiente', label: 'Pendiente', Icon: Clock3, activo: 'border-amber-400 bg-amber-500/20 text-amber-200' },
        ]}
      />
      <Segmentado
        label="Método"
        value={metodo}
        onChange={setMetodo}
        opciones={[
          { value: 'Yape', label: 'Yape / Plin', Icon: Smartphone, activo: 'border-sky-500 bg-sky-600 text-white' },
          { value: 'Efectivo', label: 'Efectivo', Icon: Banknote, activo: 'border-emerald-500 bg-emerald-500 text-white' },
        ]}
      />

      <p className="text-sm text-white/70">
        Nuevo total: <b>{compra.length + numeros.length} tickets</b> · S/ {(compra.length + numeros.length) * PRECIO}
      </p>

      {error && <p className="rounded-lg bg-red-500/15 p-2 text-sm text-red-200">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <Boton variante="suave" onClick={onCancelar}>
          Cancelar
        </Boton>
        <Boton variante="verde" onClick={guardar} disabled={guardando || numeros.length === 0}>
          {guardando ? 'Guardando…' : `Agregar ${numeros.length || ''}`}
        </Boton>
      </div>
    </div>
  );
}
