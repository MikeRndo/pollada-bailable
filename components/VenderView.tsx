'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BadgeCheck,
  Banknote,
  CircleCheck,
  CircleX,
  Clock3,
  Hash,
  ListOrdered,
  Minus,
  Phone,
  PieChart,
  Plus,
  Smartphone,
  TriangleAlert,
  User,
} from 'lucide-react';
import { MAX_POR_COMPRA, useTickets } from '@/lib/store';
import { enStock, fmtNum, NUMERO_INICIAL, parseNumeros, PRECIO, rangos, soloDigitos, ultimoNumero } from '@/lib/evento';
import { desbloquearAudio, sonidoError, sonidoVenta } from '@/lib/sonido';
import type { EstadoPago, MetodoPago } from '@/lib/types';
import { Boton, Segmentado, Tarjeta, inputCls } from './ui';
import TicketModal from './TicketModal';

const RAPIDOS = [1, 2, 3, 4, 5];
const LS_VENDEDOR = 'pollada:vendedor';

export default function VenderView() {
  const { siguiente, disponibles, capacidad, porNumero, registrar, agregarCupos, listo, libres, tickets } = useTickets();

  // Vendedor: se recuerda en este celular para no escribirlo en cada venta
  const [vendedor, setVendedor] = useState('');
  useEffect(() => {
    try {
      setVendedor(localStorage.getItem(LS_VENDEDOR) ?? '');
    } catch {
      /* almacenamiento bloqueado */
    }
  }, []);
  const vendedores = useMemo(
    () => [...new Set(tickets.map((t) => t.vendedor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [tickets],
  );

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [modoNum, setModoNum] = useState<'auto' | 'manual'>('auto');
  const [manual, setManual] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('Yape');
  const [pago, setPago] = useState<EstadoPago | 'Parcial'>('Pagado');
  const [pagaAhora, setPagaAhora] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creados, setCreados] = useState<string[] | null>(null);

  // Números que se asignarán
  const auto = useMemo(() => libres(cantidad), [libres, cantidad]);

  const chequeoManual = useMemo(() => {
    if (modoNum !== 'manual' || manual.trim() === '') return null;
    const { nums, error: e } = parseNumeros(manual);
    if (e) return { nums, ok: false, texto: e, malos: new Set<number>() };
    if (nums.length > MAX_POR_COMPRA)
      return { nums, ok: false, texto: `Máximo ${MAX_POR_COMPRA} tickets por registro.`, malos: new Set<number>() };
    const malos = new Set<number>();
    const avisos: string[] = [];
    for (const n of nums) {
      if (n < 1) {
        malos.add(n);
        avisos.push(`${n} no es válido`);
      } else if (!enStock(n, capacidad)) {
        malos.add(n);
        avisos.push(`N° ${fmtNum(n)} fuera del stock (${fmtNum(NUMERO_INICIAL)}–${fmtNum(ultimoNumero(capacidad))})`);
      } else {
        const v = porNumero.get(n);
        if (v) {
          malos.add(n);
          avisos.push(`N° ${fmtNum(n)} ya es de ${v.comprador}`);
        }
      }
    }
    if (malos.size) return { nums, ok: false, texto: avisos.join(' · '), malos };
    return {
      nums,
      ok: true,
      texto: nums.length === 1 ? `N° ${fmtNum(nums[0])} disponible` : `${nums.length} tickets disponibles`,
      malos,
    };
  }, [modoNum, manual, capacidad, porNumero]);

  const numeros: number[] =
    modoNum === 'auto' ? (auto.length === cantidad ? auto : []) : chequeoManual?.ok ? chequeoManual.nums : [];
  const cant = modoNum === 'auto' ? cantidad : (chequeoManual?.nums.length ?? 0);

  const telOk = soloDigitos(telefono).length >= 9;
  const nombreOk = nombre.trim().length >= 2;
  const vendedorOk = vendedor.trim().length >= 2;
  const puede = listo && vendedorOk && nombreOk && telOk && numeros.length > 0 && !enviando;

  const textoBoton =
    numeros.length === 0
      ? 'Registrar y Generar Ticket N° ---'
      : numeros.length === 1
        ? `Registrar y Generar Ticket N° ${fmtNum(numeros[0])}`
        : `Registrar y Generar ${numeros.length} Tickets (N° ${rangos(numeros)})`;

  // Pago parcial: "pago 2 de 3"
  const parcialPosible = cant > 1;
  const modoPago = pago === 'Parcial' && !parcialPosible ? 'Pagado' : pago;
  const pagaAhoraOk = Math.max(1, Math.min(pagaAhora, Math.max(1, cant - 1)));
  const nPagadosAhora = modoPago === 'Pagado' ? cant : modoPago === 'Parcial' ? pagaAhoraOk : 0;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    desbloquearAudio();
    if (!puede) return;
    setEnviando(true);
    setError(null);
    const r = await registrar({
      comprador: nombre,
      vendedor,
      telefono,
      metodoPago: metodo,
      estadoPago: modoPago === 'Pendiente' ? 'Pendiente' : 'Pagado',
      pagados: modoPago === 'Parcial' ? pagaAhoraOk : undefined,
      ...(modoNum === 'manual' ? { numeros } : { cantidad }),
    });
    setEnviando(false);
    if (r.ok) {
      sonidoVenta();
      try {
        localStorage.setItem(LS_VENDEDOR, vendedor.trim());
      } catch {
        /* sin almacenamiento */
      }
      setCreados(r.data.map((t) => t.id));
      setNombre('');
      setTelefono('');
      setManual('');
      setCantidad(1);
      setPago('Pagado');
      setPagaAhora(1);
    } else {
      sonidoError();
      setError(r.error);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Registrar venta</h1>
        <p className="text-sm text-white/60">S/ 15 por pollada · Yape o efectivo</p>
      </div>

      {/* Stock */}
      <Tarjeta className="flex items-center justify-between gap-3 !py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Siguiente libre</p>
          <p className="font-display text-3xl leading-none text-oro">
            {siguiente != null ? `N° ${fmtNum(siguiente)}` : 'Agotado'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Quedan</p>
          <p className="text-2xl font-extrabold tabular-nums">
            {disponibles}
            <span className="text-base font-semibold text-white/50"> / {capacidad}</span>
          </p>
        </div>
      </Tarjeta>

      {siguiente == null && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
          <p className="mb-3 flex items-center gap-2 font-semibold text-amber-200">
            <TriangleAlert className="h-5 w-5" aria-hidden /> Se acabaron los tickets del stock.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Boton variante="borde" onClick={() => agregarCupos(50)}>
              <Plus className="h-4 w-4" aria-hidden /> 50 cupos
            </Boton>
            <Boton variante="borde" onClick={() => agregarCupos(100)}>
              <Plus className="h-4 w-4" aria-hidden /> 100 cupos
            </Boton>
          </div>
        </div>
      )}

      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Tarjeta className="!py-3">
          <label htmlFor="vendedor" className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
            <BadgeCheck className="h-4 w-4 text-oro" aria-hidden /> Vendedor
          </label>
          <input
            id="vendedor"
            list="lista-vendedores"
            className={inputCls}
            value={vendedor}
            onChange={(e) => setVendedor(e.target.value)}
            placeholder="¿Quién vende? Ej. Cristofer"
            autoComplete="off"
            autoCapitalize="words"
            aria-describedby="vendedor-ayuda"
          />
          <datalist id="lista-vendedores">
            {vendedores.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <p id="vendedor-ayuda" className={`mt-1.5 text-xs ${vendedorOk ? 'text-white/45' : 'text-amber-300'}`}>
            {vendedorOk ? 'Se queda guardado en este celular para las siguientes ventas.' : 'Escribe el nombre de quien vende.'}
          </p>
        </Tarjeta>

        <Tarjeta className="space-y-4">
          <div>
            <label htmlFor="nombre" className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
              <User className="h-4 w-4" aria-hidden /> Nombre del comprador
            </label>
            <input
              id="nombre"
              className={inputCls}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. María Torres"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
            />
          </div>
          <div>
            <label htmlFor="telefono" className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
              <Phone className="h-4 w-4" aria-hidden /> Teléfono / WhatsApp
            </label>
            <input
              id="telefono"
              className={inputCls}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.replace(/[^\d +]/g, ''))}
              placeholder="987 654 321"
              inputMode="tel"
              type="tel"
              autoComplete="off"
              maxLength={16}
              aria-invalid={telefono !== '' && !telOk}
              aria-describedby="tel-ayuda"
            />
            <p
              id="tel-ayuda"
              className={`mt-1.5 text-xs ${telefono !== '' && !telOk ? 'text-amber-300' : 'text-white/45'}`}
            >
              {telefono !== '' && !telOk ? 'Faltan dígitos (mínimo 9).' : 'Se usa para enviarle los tickets.'}
            </p>
          </div>
        </Tarjeta>

        <Tarjeta className="space-y-4">
          <Segmentado
            label="Número de ticket"
            value={modoNum}
            onChange={setModoNum}
            opciones={[
              { value: 'auto', label: 'Siguientes', Icon: ListOrdered },
              { value: 'manual', label: 'Manual', Icon: Hash },
            ]}
          />

          {modoNum === 'auto' ? (
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-sm font-semibold text-white/80">¿Cuántas polladas?</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Una menos"
                    onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                    disabled={cantidad <= 1}
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 active:bg-white/20 disabled:opacity-30"
                  >
                    <Minus className="h-5 w-5" aria-hidden />
                  </button>
                  <output
                    aria-live="polite"
                    className="grid h-12 flex-1 place-items-center rounded-xl bg-oro/10 font-display text-3xl text-oro ring-1 ring-oro/40"
                  >
                    {cantidad}
                  </output>
                  <button
                    type="button"
                    aria-label="Una más"
                    onClick={() => setCantidad((c) => Math.min(MAX_POR_COMPRA, c + 1))}
                    disabled={cantidad >= MAX_POR_COMPRA}
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 active:bg-white/20 disabled:opacity-30"
                  >
                    <Plus className="h-5 w-5" aria-hidden />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {RAPIDOS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCantidad(n)}
                      aria-pressed={cantidad === n}
                      className={`h-11 rounded-xl text-base font-bold ${
                        cantidad === n ? 'bg-oro text-noche-950' : 'bg-white/[.06] text-white/75 ring-1 ring-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-white/65">
                {auto.length < cantidad ? (
                  <span className="text-amber-300">
                    Solo quedan {auto.length} libres. Baja la cantidad o agrega cupos.
                  </span>
                ) : (
                  <>
                    Se asignará{cantidad > 1 ? 'n' : ''}:{' '}
                    <strong className="text-oro">N° {rangos(auto)}</strong>
                  </>
                )}
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="manual" className="mb-2 block text-sm font-semibold text-white/80">
                Números de los tickets físicos
              </label>
              <input
                id="manual"
                className={`${inputCls} font-display text-xl tracking-wider`}
                value={manual}
                onChange={(e) => setManual(e.target.value.replace(/[^\d,\s\-–;]/g, ''))}
                placeholder="545   ó   545, 546   ó   545-547"
                inputMode="text"
                autoComplete="off"
                aria-describedby="manual-ayuda"
                aria-invalid={chequeoManual ? !chequeoManual.ok : undefined}
              />
              {chequeoManual && chequeoManual.nums.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Números ingresados">
                  {chequeoManual.nums.map((n) => (
                    <li
                      key={n}
                      className={`rounded-lg px-2 py-1 font-display text-sm ${
                        chequeoManual.malos.has(n)
                          ? 'bg-red-500/20 text-red-200 line-through ring-1 ring-red-400/40'
                          : 'bg-oro/15 text-oro ring-1 ring-oro/40'
                      }`}
                    >
                      {fmtNum(n)}
                    </li>
                  ))}
                </ul>
              )}
              <p
                id="manual-ayuda"
                aria-live="polite"
                className={`mt-1.5 flex items-start gap-1.5 text-sm ${
                  chequeoManual == null ? 'text-white/45' : chequeoManual.ok ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                {chequeoManual?.ok === true && <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                {chequeoManual?.ok === false && <CircleX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                {chequeoManual?.texto ?? 'Uno o varios, separados por coma. Para seguidos usa guion: 545-547.'}
              </p>
            </div>
          )}
        </Tarjeta>

        <Tarjeta className="space-y-4">
          <Segmentado
            label="Método de pago"
            value={metodo}
            onChange={setMetodo}
            opciones={[
              { value: 'Yape', label: 'Yape / Plin', Icon: Smartphone, activo: 'border-[#7b2cbf] bg-[#7b2cbf] text-white' },
              {
                value: 'Efectivo',
                label: 'Efectivo',
                Icon: Banknote,
                activo: 'border-emerald-500 bg-emerald-500 text-white',
              },
            ]}
          />
          <Segmentado
            label="Estado del pago"
            value={modoPago}
            onChange={setPago}
            opciones={[
              {
                value: 'Pagado',
                label: parcialPosible ? 'Todo' : 'Pagado',
                Icon: CircleCheck,
                activo: 'border-emerald-500 bg-emerald-500/20 text-emerald-200',
              },
              ...(parcialPosible
                ? [
                    {
                      value: 'Parcial' as const,
                      label: 'Parcial',
                      Icon: PieChart,
                      activo: 'border-sky-400 bg-sky-500/20 text-sky-200',
                    },
                  ]
                : []),
              {
                value: 'Pendiente',
                label: parcialPosible ? 'Nada' : 'Pendiente de pago',
                Icon: Clock3,
                activo: 'border-amber-400 bg-amber-500/20 text-amber-200',
              },
            ]}
          />

          {modoPago === 'Parcial' && (
            <div className="rounded-xl bg-sky-500/10 p-3 ring-1 ring-sky-400/30">
              <p className="mb-2 text-sm font-semibold text-sky-100">¿Cuántos tickets paga ahora?</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Uno menos"
                  onClick={() => setPagaAhora(Math.max(1, pagaAhoraOk - 1))}
                  disabled={pagaAhoraOk <= 1}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 disabled:opacity-30"
                >
                  <Minus className="h-5 w-5" aria-hidden />
                </button>
                <output className="grid h-12 flex-1 place-items-center rounded-xl bg-sky-400/15 text-lg font-extrabold text-sky-100">
                  {pagaAhoraOk} de {cant}
                </output>
                <button
                  type="button"
                  aria-label="Uno más"
                  onClick={() => setPagaAhora(Math.min(cant - 1, pagaAhoraOk + 1))}
                  disabled={pagaAhoraOk >= cant - 1}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 disabled:opacity-30"
                >
                  <Plus className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1 rounded-xl bg-white/[.05] px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Total {cant > 1 ? `(${cant} × S/ ${PRECIO})` : ''}</span>
              <span className="text-xl font-extrabold tabular-nums">S/ {Math.max(cant, 0) * PRECIO}</span>
            </div>
            {cant > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-300">Paga ahora: S/ {nPagadosAhora * PRECIO}</span>
                <span className={cant - nPagadosAhora > 0 ? 'font-semibold text-amber-300' : 'text-white/45'}>
                  Falta: S/ {(cant - nPagadosAhora) * PRECIO}
                </span>
              </div>
            )}
          </div>
        </Tarjeta>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-red-500/15 p-3 text-sm text-red-200 ring-1 ring-red-400/30"
          >
            <CircleX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <Boton type="submit" disabled={!puede} className="h-auto min-h-14 w-full py-3 text-base leading-tight">
          {enviando ? 'Registrando…' : textoBoton}
        </Boton>
      </form>

      {creados && (
        <TicketModal
          ticketIds={creados}
          titulo={creados.length > 1 ? `¡${creados.length} tickets generados!` : '¡Ticket generado!'}
          onClose={() => setCreados(null)}
        />
      )}
    </div>
  );
}
