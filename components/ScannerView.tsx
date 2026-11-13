'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import {
  Banknote,
  Camera,
  CameraOff,
  ChefHat,
  ScanLine,
  CircleCheck,
  CircleX,
  ImagePlus,
  Search,
  Smartphone,
  TriangleAlert,
} from 'lucide-react';
import { useTickets } from '@/lib/store';
import { PRECIO, fmtNum, horaCorta, normalizar, parseQr } from '@/lib/evento';
import { desbloquearAudio, sonidoError, sonidoPendiente, sonidoValido } from '@/lib/sonido';
import type { MetodoPago, Ticket } from '@/lib/types';
import { Boton, PillEntrega, PillPago, Tarjeta, inputCls } from './ui';

type Veredicto =
  | { tipo: 'ok'; ticket: Ticket }
  | { tipo: 'pago'; ticket: Ticket }
  | { tipo: 'cola'; ticket: Ticket }
  | { tipo: 'usado'; ticket: Ticket }
  | { tipo: 'invalido'; titulo: string; detalle: string };

type Registro = { id: number; texto: string; tipo: Veredicto['tipo']; hora: string };

export default function ScannerView() {
  const { tickets, porNumero, escanear, marcarPagado } = useTickets();
  const [camara, setCamara] = useState<'off' | 'iniciando' | 'on' | 'error'>('off');
  const [camError, setCamError] = useState('');
  const [veredicto, setVeredicto] = useState<Veredicto | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [historial, setHistorial] = useState<Registro[]>([]);

  const qrRef = useRef<Html5Qrcode | null>(null);
  const bloqueado = useRef(false);
  const ultimo = useRef<{ texto: string; t: number }>({ texto: '', t: 0 });
  const porNumeroRef = useRef(porNumero);
  porNumeroRef.current = porNumero;

  const anotar = (v: Veredicto) => {
    const texto =
      v.tipo === 'invalido' ? v.titulo : `N° ${fmtNum(v.ticket.numeroTicket)} · ${v.ticket.comprador}`;
    setHistorial((h) => [{ id: Date.now(), texto, tipo: v.tipo, hora: horaCorta(new Date().toISOString()) }, ...h].slice(0, 8));
  };

  const mostrar = useCallback((v: Veredicto) => {
    bloqueado.current = true;
    setVeredicto(v);
    anotar(v);
    if (v.tipo === 'ok') sonidoValido();
    else if (v.tipo === 'pago') sonidoPendiente();
    else sonidoError();
  }, []);

  const evaluar = useCallback(
    async (t: Ticket) => {
      if (t.estadoEntrega === 'Entregado') return mostrar({ tipo: 'usado', ticket: t });
      if (t.estadoEntrega === 'PorRecoger') return mostrar({ tipo: 'cola', ticket: t });
      if (t.estadoPago !== 'Pagado') return mostrar({ tipo: 'pago', ticket: t });
      setProcesando(true);
      const r = await escanear(t.id);
      setProcesando(false);
      if (r.ok) return mostrar({ tipo: 'ok', ticket: r.data });
      if (r.ticket?.estadoEntrega === 'Entregado') return mostrar({ tipo: 'usado', ticket: r.ticket });
      if (r.ticket?.estadoEntrega === 'PorRecoger') return mostrar({ tipo: 'cola', ticket: r.ticket });
      mostrar({ tipo: 'invalido', titulo: 'No se pudo registrar', detalle: r.error });
    },
    [escanear, mostrar],
  );

  const alLeer = useCallback(
    (texto: string) => {
      if (bloqueado.current) return;
      const ahora = Date.now();
      if (texto === ultimo.current.texto && ahora - ultimo.current.t < 3000) return;
      ultimo.current = { texto, t: ahora };

      const p = parseQr(texto);
      if (!p)
        return mostrar({
          tipo: 'invalido',
          titulo: '🚫 QR NO VÁLIDO',
          detalle: 'Este código no pertenece a la Gran Pollada Pro Salud.',
        });
      const t = porNumeroRef.current.get(p.numero);
      if (!t)
        return mostrar({
          tipo: 'invalido',
          titulo: `🚫 Ticket N° ${fmtNum(p.numero)} no registrado`,
          detalle: 'Este número no figura en las ventas. Verifica en caja.',
        });
      if (t.firma !== p.firma)
        return mostrar({
          tipo: 'invalido',
          titulo: `🚫 ¡CUIDADO! QR adulterado (N° ${fmtNum(p.numero)})`,
          detalle: 'La firma del código no coincide con la venta registrada. Posible copia o falsificación.',
        });
      void evaluar(t);
    },
    [evaluar, mostrar],
  );

  const alLeerRef = useRef(alLeer);
  alLeerRef.current = alLeer;

  async function iniciar() {
    desbloquearAudio();
    setCamError('');
    // Sin HTTPS el navegador ni siquiera ofrece la cámara en vivo
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCamara('error');
      setCamError('INSEGURO');
      return;
    }
    setCamara('iniciando');
    try {
      const mod = await import('html5-qrcode');
      const crear = () =>
        new mod.Html5Qrcode('lector-qr', {
          formatsToSupport: [mod.Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      const config = {
        fps: 10,
        qrbox: (w: number, h: number) => {
          const lado = Math.max(160, Math.floor(Math.min(w, h) * 0.72));
          return { width: lado, height: lado };
        },
      };
      const alOk = (txt: string) => alLeerRef.current(txt);

      if (!qrRef.current) qrRef.current = crear();
      try {
        await qrRef.current.start({ facingMode: 'environment' }, config, alOk, () => {});
      } catch {
        // Algunos celulares/PC no aceptan "environment": elegimos la cámara por su id
        try {
          qrRef.current.clear();
        } catch {
          /* nada que limpiar */
        }
        qrRef.current = crear();
        const camaras = await mod.Html5Qrcode.getCameras();
        if (!camaras.length) throw new Error('NotFoundError');
        const trasera =
          camaras.find((c) => /back|rear|trasera|environment|posterior/i.test(c.label)) ?? camaras[camaras.length - 1];
        await qrRef.current.start(trasera.id, config, alOk, () => {});
      }
      setCamara('on');
    } catch (e) {
      setCamara('error');
      const msg = `${(e as Error)?.name ?? ''} ${(e as Error)?.message ?? e}`;
      setCamError(
        /NotAllowed|Permission|denied/i.test(msg)
          ? 'Permiso de cámara denegado. Toca el candado de la barra de direcciones → Permisos → Cámara → Permitir, y recarga.'
          : /NotFound|no camera|Requested device not found/i.test(msg)
            ? 'No se encontró ninguna cámara en este dispositivo.'
            : /NotReadable|in use|Could not start/i.test(msg)
              ? 'La cámara está ocupada por otra app (WhatsApp, cámara, videollamada). Ciérrala y vuelve a intentar.'
              : `No se pudo abrir la cámara (${msg.trim().slice(0, 120)}). Usa "Escanear con foto".`,
      );
    }
  }

  // Alternativa que funciona SIN HTTPS: abre la cámara nativa, toma la foto y lee el QR
  async function leerFoto(file: File) {
    desbloquearAudio();
    setProcesando(true);
    try {
      const mod = await import('html5-qrcode');
      const lector = new mod.Html5Qrcode('lector-foto', { verbose: false });
      try {
        const txt = await lector.scanFile(file, false);
        bloqueado.current = false;
        ultimo.current = { texto: '', t: 0 };
        alLeer(txt);
      } finally {
        try {
          lector.clear();
        } catch {
          /* ok */
        }
      }
    } catch {
      mostrar({
        tipo: 'invalido',
        titulo: 'No se encontró un QR en la foto',
        detalle: 'Toma la foto más cerca, con buena luz y que el QR salga completo y enfocado.',
      });
    } finally {
      setProcesando(false);
    }
  }

  async function detener() {
    try {
      if (qrRef.current?.isScanning) await qrRef.current.stop();
    } catch {
      /* ya estaba detenida */
    }
    setCamara('off');
  }

  useEffect(() => {
    return () => {
      const q = qrRef.current;
      if (q?.isScanning) q.stop().catch(() => {});
    };
  }, []);

  // Verde se cierra solo para agilizar la cola de cocina
  useEffect(() => {
    if (veredicto?.tipo !== 'ok') return;
    const id = setTimeout(() => cerrar(), 2200);
    return () => clearTimeout(id);
  }, [veredicto]);

  function cerrar() {
    setVeredicto(null);
    bloqueado.current = false;
    ultimo.current = { texto: ultimo.current.texto, t: Date.now() };
  }

  async function cobrarYEntregar(t: Ticket, m: MetodoPago) {
    setProcesando(true);
    const r = await marcarPagado(t.id, m);
    setProcesando(false);
    if (!r.ok) return mostrar({ tipo: 'invalido', titulo: 'No se pudo registrar el pago', detalle: r.error });
    setVeredicto(null);
    await evaluar(r.data);
  }

  const resultados = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return [];
    const soloNum = /^\d+$/.test(q);
    return tickets
      .filter((t) =>
        soloNum
          ? fmtNum(t.numeroTicket).includes(q) || t.numeroTicket === Number(q)
          : normalizar(t.comprador).includes(q),
      )
      .sort((a, b) =>
        soloNum ? Number(b.numeroTicket === Number(q)) - Number(a.numeroTicket === Number(q)) : 0,
      )
      .slice(0, 8);
  }, [busqueda, tickets]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <ScanLine className="h-6 w-6 text-oro" aria-hidden /> Escáner de tickets
        </h1>
        <p className="text-sm text-white/60">Escanea el QR: si está pagado, el pedido pasa a la cola de Cocina.</p>
      </div>

      {/* Cámara */}
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-black ring-2 ring-white/10">
        <div id="lector-qr" className="absolute inset-0" />
        {camara === 'on' && (
          <div className="pointer-events-none absolute inset-[14%] rounded-2xl border-2 border-oro/80">
            <span className="absolute inset-x-3 h-0.5 animate-barrido rounded bg-oro shadow-[0_0_12px_#ffd60a]" />
          </div>
        )}
        {camara !== 'on' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Camera className="h-12 w-12 text-white/30" aria-hidden />
            {camError === 'INSEGURO' ? (
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-amber-200">La cámara en vivo necesita HTTPS</p>
                <p className="text-white/65">
                  Abriste la app con <span className="font-mono">http://</span>. Usa “Escanear con foto” (funciona
                  igual) o abre la versión <span className="font-mono">https://</span>.
                </p>
              </div>
            ) : (
              camError && <p className="text-sm text-red-300">{camError}</p>
            )}
            {camError !== 'INSEGURO' && (
              <Boton onClick={iniciar} disabled={camara === 'iniciando'} className="px-6">
                <Camera className="h-5 w-5" aria-hidden />
                {camara === 'iniciando' ? 'Abriendo cámara…' : camara === 'error' ? 'Reintentar cámara' : 'Activar cámara'}
              </Boton>
            )}
          </div>
        )}
        {procesando && (
          <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-semibold">Verificando…</div>
        )}
      </div>
      {camara === 'on' && (
        <Boton variante="suave" onClick={detener} className="w-full">
          <CameraOff className="h-5 w-5" aria-hidden /> Apagar cámara
        </Boton>
      )}

      <label className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 px-4 text-[15px] font-bold active:scale-[.98]">
        <ImagePlus className="h-5 w-5" aria-hidden /> Escanear con foto
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void leerFoto(f);
            e.target.value = '';
          }}
        />
      </label>
      <div id="lector-foto" className="hidden" aria-hidden />

      {/* Búsqueda manual */}
      <Tarjeta className="space-y-3">
        <label htmlFor="buscar" className="flex items-center gap-2 text-sm font-semibold text-white/80">
          <Search className="h-4 w-4" aria-hidden /> Búsqueda manual (papel mojado o roto)
        </label>
        <input
          id="buscar"
          className={inputCls}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="N° 042 o nombre del comprador"
          autoComplete="off"
          enterKeyHint="search"
        />
        {busqueda && resultados.length === 0 && <p className="text-sm text-white/50">Sin coincidencias.</p>}
        <ul className="space-y-2">
          {resultados.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  desbloquearAudio();
                  bloqueado.current = false;
                  void evaluar(t);
                }}
                className="flex w-full items-center gap-3 rounded-xl bg-white/[.04] p-2.5 text-left ring-1 ring-white/10 active:bg-white/10"
              >
                <span className="grid h-11 w-14 shrink-0 place-items-center rounded-lg bg-oro font-display text-lg text-noche-950">
                  {fmtNum(t.numeroTicket)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{t.comprador}</span>
                  <span className="mt-1 flex gap-1.5">
                    <PillPago estado={t.estadoPago} />
                    <PillEntrega estado={t.estadoEntrega} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Tarjeta>

      {historial.length > 0 && (
        <section aria-labelledby="hist">
          <h2 id="hist" className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/50">
            Últimos escaneos
          </h2>
          <ul className="space-y-1.5">
            {historial.map((h) => (
              <li key={h.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    h.tipo === 'ok' ? 'bg-emerald-400' : h.tipo === 'pago' ? 'bg-amber-400' : 'bg-red-500'
                  }`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{h.texto}</span>
                <span className="tabular-nums text-white/45">{h.hora}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {veredicto && (
        <Pantallazo v={veredicto} onCerrar={cerrar} onCobrar={cobrarYEntregar} procesando={procesando} />
      )}
    </div>
  );
}

function Pantallazo({
  v,
  onCerrar,
  onCobrar,
  procesando,
}: {
  v: Veredicto;
  onCerrar: () => void;
  onCobrar: (t: Ticket, m: MetodoPago) => void;
  procesando: boolean;
}) {
  const estilo = {
    ok: 'bg-emerald-600',
    pago: 'bg-amber-400 text-noche-950',
    cola: 'bg-red-700',
    usado: 'bg-red-700',
    invalido: 'bg-red-700',
  }[v.tipo];

  const Icono = v.tipo === 'ok' ? CircleCheck : v.tipo === 'pago' ? TriangleAlert : CircleX;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-modal="true"
      className={`fixed inset-0 z-[70] flex animate-fade flex-col items-center justify-center gap-5 px-6 text-center ${estilo}`}
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
      }}
      onClick={v.tipo === 'pago' ? undefined : onCerrar}
    >
      <Icono className="h-28 w-28 animate-pop drop-shadow-xl" strokeWidth={2.2} aria-hidden />

      {v.tipo === 'ok' && (
        <>
          <p className="text-xl font-bold uppercase tracking-wide">Válido y pagado</p>
          <p className="font-display text-7xl leading-none">N° {fmtNum(v.ticket.numeroTicket)}</p>
          <p className="text-2xl font-bold">{v.ticket.comprador}</p>
          <p className="flex items-center gap-2 rounded-full bg-black/20 px-5 py-2 text-lg font-extrabold">
            <ChefHat className="h-6 w-6" aria-hidden /> PASA A COCINA · POR RECOGER
          </p>
        </>
      )}

      {v.tipo === 'pago' && (
        <>
          <p className="font-display text-6xl leading-none">N° {fmtNum(v.ticket.numeroTicket)}</p>
          <p className="text-xl font-bold">{v.ticket.comprador}</p>
          <p className="rounded-2xl bg-black/10 p-4 text-xl font-extrabold leading-snug">
            ⚠️ ATENCIÓN: Falta cobrar S/ {PRECIO} por {v.ticket.metodoPago} antes de entregar
          </p>
          <div className="grid w-full max-w-sm gap-2">
            <button
              type="button"
              disabled={procesando}
              onClick={() => onCobrar(v.ticket, 'Yape')}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-sky-600 text-base font-bold text-white disabled:opacity-50"
            >
              <Smartphone className="h-5 w-5" aria-hidden /> Cobré con Yape · A cocina
            </button>
            <button
              type="button"
              disabled={procesando}
              onClick={() => onCobrar(v.ticket, 'Efectivo')}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-emerald-700 text-base font-bold text-white disabled:opacity-50"
            >
              <Banknote className="h-5 w-5" aria-hidden /> Cobré en Efectivo · A cocina
            </button>
            <button
              type="button"
              onClick={onCerrar}
              className="min-h-12 rounded-xl bg-black/15 text-base font-bold"
            >
              Todavía no
            </button>
          </div>
        </>
      )}

      {v.tipo === 'cola' && (
        <>
          <p className="text-3xl font-extrabold leading-tight">
            🚫 ¡CUIDADO! El Ticket N° {fmtNum(v.ticket.numeroTicket)} ya fue escaneado a las{' '}
            {horaCorta(v.ticket.fechaEscaneo)}
          </p>
          <p className="text-lg text-white/85">Comprador: {v.ticket.comprador}</p>
          <p className="flex items-center gap-2 text-base font-bold uppercase text-white/85">
            <ChefHat className="h-5 w-5" aria-hidden /> Ya está en la cola de Cocina
          </p>
        </>
      )}

      {v.tipo === 'usado' && (
        <>
          <p className="text-3xl font-extrabold leading-tight">
            🚫 ¡CUIDADO! El Ticket N° {fmtNum(v.ticket.numeroTicket)} ya fue canjeado a las{' '}
            {horaCorta(v.ticket.fechaEntrega)}
          </p>
          <p className="text-lg text-white/85">Comprador: {v.ticket.comprador}</p>
          <p className="text-base font-bold uppercase text-white/80">No entregar otra pollada</p>
        </>
      )}

      {v.tipo === 'invalido' && (
        <>
          <p className="text-3xl font-extrabold leading-tight">{v.titulo}</p>
          <p className="text-lg text-white/85">{v.detalle}</p>
        </>
      )}

      {v.tipo !== 'pago' && (
        <p
          className="absolute text-sm font-semibold opacity-80"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
        >
          {v.tipo === 'ok' ? 'Siguiente en 2 s · toca para continuar' : 'Toca para continuar'}
        </p>
      )}
    </div>
  );
}
