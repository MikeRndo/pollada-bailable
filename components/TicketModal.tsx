'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  Maximize2,
  MessageCircle,
  Printer,
  Share2,
  X,
} from 'lucide-react';
import TicketCard, { PLANTILLA } from './TicketCard';
import { Boton, Hoja, PillEntrega, PillPago } from './ui';
import { useTickets } from '@/lib/store';
import { PRECIO, fmtNum, qrPayload, rangos } from '@/lib/evento';
import { mensajeCompra, waLink } from '@/lib/whatsapp';
import { descargarBlob } from '@/lib/exportar';
import { cargarAfiche, generarImagenTicket } from '@/lib/imagenTicket';
import { crearZip } from '@/lib/zip';

/** El menú Compartir de Android/iPhone acepta como máximo 10 archivos por envío */
const POR_ENVIO = 10;

export default function TicketModal({
  ticketIds,
  onClose,
  titulo,
}: {
  ticketIds: string[];
  onClose: () => void;
  titulo?: string;
}) {
  const { tickets } = useTickets();
  const lista = useMemo(
    () =>
      ticketIds
        .map((id) => tickets.find((x) => x.id === id))
        .filter((t): t is NonNullable<typeof t> => !!t)
        .sort((a, b) => a.numeroTicket - b.numeroTicket),
    [ticketIds, tickets],
  );

  const qrs = useRef<HTMLDivElement>(null);
  const carrusel = useRef<HTMLDivElement>(null);
  const [imgs, setImgs] = useState<Blob[] | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [fallo, setFallo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviados, setEnviados] = useState<Set<number>>(new Set());
  const [actual, setActual] = useState(0);
  const [grande, setGrande] = useState(false);
  const [zipeando, setZipeando] = useState(false);

  const firmaLista = lista.map((t) => `${t.id}:${t.firma}`).join('|');

  // Genera las imágenes al abrir (rápido: se dibujan en canvas, una por una, mostrando el avance)
  useEffect(() => {
    if (lista.length === 0) return;
    let cancelado = false;
    setImgs(null);
    setProgreso(0);
    setFallo(null);
    setEnviados(new Set());
    (async () => {
      await document.fonts?.ready;
      const afiche = await cargarAfiche(PLANTILLA.src);
      const escala = lista.length > POR_ENVIO ? 0.75 : 1;
      const out: Blob[] = [];
      for (let i = 0; i < lista.length; i++) {
        if (cancelado) return;
        const svg = qrs.current?.querySelector<SVGSVGElement>(`[data-qr="${lista[i].id}"] svg`);
        if (!svg) throw new Error('QR no encontrado');
        out.push(await generarImagenTicket({ afiche, qrSvg: svg, numero: fmtNum(lista[i].numeroTicket), escala }));
        setProgreso(i + 1);
        await new Promise((r) => setTimeout(r, 0)); // deja respirar al celular
      }
      if (!cancelado) setImgs(out);
    })().catch((e) => {
      console.error(e);
      if (!cancelado) setFallo('No se pudieron preparar las imágenes. Cierra y vuelve a abrir el ticket.');
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaLista]);

  if (lista.length === 0) return null;
  const t0 = lista[0];
  const varios = lista.length > 1;
  const texto = mensajeCompra(lista);
  const nombres = lista.map((t) => `ticket-pollada-${fmtNum(t.numeroTicket)}.jpg`);
  const actualT = lista[Math.min(actual, lista.length - 1)];
  const pendientes = lista.filter((t) => t.estadoPago === 'Pendiente').length;

  // Grupos de máx. 10 tickets por envío
  const lotes: number[][] = [];
  for (let i = 0; i < lista.length; i += POR_ENVIO)
    lotes.push(Array.from({ length: Math.min(POR_ENVIO, lista.length - i) }, (_, k) => i + k));

  function ir(i: number) {
    const el = carrusel.current;
    if (!el) return;
    const destino = Math.max(0, Math.min(lista.length - 1, i));
    el.scrollTo({ left: destino * el.clientWidth, behavior: 'smooth' });
  }

  function abrirChat() {
    window.open(waLink(t0.telefono, ''), '_blank', 'noopener');
  }

  async function descargarZip() {
    if (!imgs) return;
    setZipeando(true);
    try {
      const zip = await crearZip(imgs.map((b, i) => ({ nombre: nombres[i], blob: b })));
      descargarBlob(zip, `tickets-${t0.comprador.split(' ')[0].toLowerCase()}-N${fmtNum(t0.numeroTicket)}.zip`);
    } finally {
      setZipeando(false);
    }
  }

  /** Envía un grupo de tickets (imágenes con QR) por WhatsApp; el primero lleva el mensaje */
  async function enviarLote(n: number) {
    setAviso(null);
    if (!imgs) return;
    const idx = lotes[n];
    const archivos = idx.map((i) => new File([imgs[i]], nombres[i], { type: 'image/jpeg' }));
    const datos: ShareData = n === 0 ? { files: archivos, text: texto, title: 'Tickets Gran Pollada Pro Salud' } : { files: archivos };
    if (navigator.canShare?.(datos)) {
      try {
        await navigator.share(datos);
        setEnviados((s) => new Set(s).add(n));
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return;
      }
    }
    // PC o navegador sin compartir: UNA sola descarga (imagen o .zip) + abre el chat con el mensaje
    if (idx.length === 1) descargarBlob(imgs[idx[0]], nombres[idx[0]]);
    else await descargarZip();
    window.open(waLink(t0.telefono, texto), '_blank', 'noopener');
    setAviso(
      idx.length === 1
        ? 'Se descargó la imagen y se abrió el chat: adjúntala antes de enviar.'
        : 'Se descargó un .zip con todos los tickets y se abrió el chat: descomprímelo y adjunta las imágenes.',
    );
  }

  const listo = !!imgs;

  return (
    <Hoja
      titulo={
        titulo ??
        (varios ? `${lista.length} tickets · N° ${rangos(lista.map((t) => t.numeroTicket))}` : `Ticket N° ${fmtNum(t0.numeroTicket)}`)
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Carrusel: un ticket por vista */}
        <div className="relative">
          <div
            ref={carrusel}
            onScroll={(e) => {
              const el = e.currentTarget;
              setActual(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
            }}
            className="flex snap-x snap-mandatory overflow-x-auto rounded-xl [scrollbar-width:none]"
          >
            {lista.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setGrande(true)}
                className="relative w-full shrink-0 snap-center"
                aria-label={`Ver ticket N° ${fmtNum(t.numeroTicket)} en pantalla completa`}
              >
                <TicketCard ticket={t} />
                <span className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white">
                  <Maximize2 className="h-4 w-4" aria-hidden />
                </span>
              </button>
            ))}
          </div>
          {varios && (
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => ir(actual - 1)}
                disabled={actual === 0}
                aria-label="Ticket anterior"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <span className="text-sm font-semibold tabular-nums text-white/70">
                {actual + 1} de {lista.length} · N° {fmtNum(actualT.numeroTicket)}
              </span>
              <button
                type="button"
                onClick={() => ir(actual + 1)}
                disabled={actual >= lista.length - 1}
                aria-label="Ticket siguiente"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{t0.comprador}</span>
          <span className="text-white/50">· {t0.telefono}</span>
          <span className="text-white/50">· S/ {lista.length * PRECIO}</span>
          {varios ? (
            <PillPago estado={pendientes > 0 ? 'Pendiente' : 'Pagado'} />
          ) : (
            <>
              <PillPago estado={t0.estadoPago} />
              <PillEntrega estado={t0.estadoEntrega} />
            </>
          )}
        </div>

        {/* Preparando imágenes */}
        {!listo && !fallo && (
          <div className="space-y-1.5" role="status">
            <p className="text-sm text-white/70">
              Preparando imágenes… {progreso} de {lista.length}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 transition-[width]"
                style={{ width: `${(progreso / lista.length) * 100}%` }}
              />
            </div>
          </div>
        )}
        {fallo && <p className="rounded-lg bg-red-500/15 p-2 text-sm text-red-200">{fallo}</p>}

        {/* Envío: 1 botón, o varios grupos de 10 */}
        {lotes.length === 1 ? (
          <Boton variante="verde" onClick={() => enviarLote(0)} disabled={!listo} className="w-full text-base">
            <Share2 className="h-5 w-5" aria-hidden />
            {varios ? `Enviar ${lista.length} tickets por WhatsApp` : 'Enviar ticket por WhatsApp'}
          </Boton>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-white/70">
              WhatsApp acepta hasta {POR_ENVIO} imágenes por envío. Envía cada grupo al mismo chat:
            </p>
            {lotes.map((idx, n) => {
              const hecho = enviados.has(n);
              return (
                <Boton
                  key={n}
                  variante={hecho ? 'suave' : 'verde'}
                  onClick={() => enviarLote(n)}
                  disabled={!listo}
                  className="w-full"
                >
                  {hecho ? <CircleCheck className="h-5 w-5" aria-hidden /> : <Share2 className="h-5 w-5" aria-hidden />}
                  {n + 1}° envío · N° {rangos(idx.map((i) => lista[i].numeroTicket))}
                  {n === 0 ? ' + mensaje' : ''}
                </Boton>
              );
            })}
          </div>
        )}
        <p className="-mt-2 text-xs text-white/55">
          Elige <b>WhatsApp</b> y el chat de <b>{t0.comprador.split(' ')[0]}</b> ({t0.telefono}).
        </p>
        <button
          type="button"
          onClick={abrirChat}
          className="-mt-1 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 text-sm font-semibold text-emerald-200 active:bg-emerald-500/10"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          ¿No aparece el contacto? Abrir chat de {t0.telefono}
        </button>
        {aviso && <p className="rounded-lg bg-amber-500/15 p-2 text-sm text-amber-200">{aviso}</p>}

        <div className={`grid gap-2 ${varios ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <Boton
            variante="suave"
            disabled={!listo}
            onClick={() => imgs && descargarBlob(imgs[Math.min(actual, imgs.length - 1)], nombres[Math.min(actual, nombres.length - 1)])}
            className="!px-2 text-sm"
          >
            <Download className="h-5 w-5 shrink-0" aria-hidden /> {varios ? 'Este' : 'Descargar'}
          </Boton>
          {varios && (
            <Boton variante="suave" disabled={!listo || zipeando} onClick={descargarZip} className="!px-2 text-sm">
              <FileArchive className="h-5 w-5 shrink-0" aria-hidden /> {zipeando ? '…' : 'Todos .zip'}
            </Boton>
          )}
          <Boton variante="suave" onClick={() => window.print()} className="!px-2 text-sm">
            <Printer className="h-5 w-5 shrink-0" aria-hidden /> Imprimir
          </Boton>
        </div>
      </div>

      {/* QRs ocultos: de aquí se copian al dibujar cada imagen */}
      <div ref={qrs} aria-hidden className="pointer-events-none fixed left-[-9999px] top-0">
        {lista.map((t) => (
          <div key={t.id} data-qr={t.id}>
            <QRCodeSVG value={qrPayload(t)} level="H" marginSize={0} size={256} bgColor="#ffffff" fgColor="#000000" />
          </div>
        ))}
      </div>

      {/* Solo visible al imprimir */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="zona-impresion" className="hidden">
            {lista.map((t) => (
              <div key={t.id} className="mb-[6mm] break-inside-avoid">
                <TicketCard ticket={t} />
              </div>
            ))}
          </div>,
          document.body,
        )}

      {grande && (
        <div
          className="fixed inset-0 z-[60] grid animate-fade place-items-center bg-black"
          onClick={() => setGrande(false)}
          role="dialog"
          aria-label={`Ticket N° ${fmtNum(actualT.numeroTicket)} en pantalla completa`}
        >
          <div
            className="portrait:rotate-90"
            style={{
              width: `min(calc(100vmax - 2rem), calc((100vmin - 2rem) * ${PLANTILLA.ancho / PLANTILLA.alto}))`,
            }}
          >
            <TicketCard ticket={actualT} />
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] grid h-11 w-11 place-items-center rounded-full bg-white/15"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      )}
    </Hoja>
  );
}
