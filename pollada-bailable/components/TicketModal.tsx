'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toBlob } from 'html-to-image';
import { ChevronLeft, ChevronRight, Download, Maximize2, MessageCircle, Printer, Share2, X } from 'lucide-react';
import TicketCard from './TicketCard';
import { Boton, Hoja, PillEntrega, PillPago } from './ui';
import { useTickets } from '@/lib/store';
import { PRECIO, fmtNum, rangos } from '@/lib/evento';
import { mensajeCompra, waLink } from '@/lib/whatsapp';
import { descargarBlob } from '@/lib/exportar';

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

  const capturas = useRef<(HTMLDivElement | null)[]>([]);
  const carrusel = useRef<HTMLDivElement>(null);
  const [pngs, setPngs] = useState<Blob[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [actual, setActual] = useState(0);
  const [grande, setGrande] = useState(false);

  const firmaLista = lista.map((t) => `${t.id}:${t.estadoPago}`).join('|');

  // Pre-genera las imágenes para que "Compartir" sea instantáneo
  // (los celulares exigen que navigator.share se llame justo tras el toque).
  useEffect(() => {
    if (lista.length === 0) return;
    let cancelado = false;
    setPngs(null);
    (async () => {
      await document.fonts?.ready;
      await new Promise((r) => setTimeout(r, 200));
      const out: Blob[] = [];
      for (let i = 0; i < lista.length; i++) {
        const nodo = capturas.current[i];
        if (!nodo) return;
        const b = await toBlob(nodo, { pixelRatio: lista.length > 4 ? 1.2 : 1.6, cacheBust: true });
        if (cancelado) return;
        if (b) out.push(b);
      }
      if (!cancelado) setPngs(out);
    })().catch(() => {});
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaLista]);

  if (lista.length === 0) return null;
  const t0 = lista[0];
  const varios = lista.length > 1;
  const texto = mensajeCompra(lista);
  const nombres = lista.map((t) => `ticket-pollada-${fmtNum(t.numeroTicket)}.png`);
  const actualT = lista[Math.min(actual, lista.length - 1)];

  function ir(i: number) {
    const el = carrusel.current;
    if (!el) return;
    const destino = Math.max(0, Math.min(lista.length - 1, i));
    el.scrollTo({ left: destino * el.clientWidth, behavior: 'smooth' });
  }

  async function compartir() {
    setAviso(null);
    if (pngs && pngs.length) {
      const archivos = pngs.map((b, i) => new File([b], nombres[i], { type: 'image/png' }));
      if (navigator.canShare?.({ files: archivos })) {
        try {
          await navigator.share({ files: archivos, text: texto, title: 'Tickets Gran Pollada Bailable' });
          return;
        } catch (e) {
          if ((e as DOMException)?.name === 'AbortError') return;
        }
      }
      // Sin Web Share (PC / navegador antiguo): descarga las imágenes y abre el chat
      pngs.forEach((b, i) => setTimeout(() => descargarBlob(b, nombres[i]), i * 350));
      setAviso(
        varios
          ? `Se descargaron ${pngs.length} imágenes: adjúntalas en el chat de WhatsApp que se abrió.`
          : 'Se descargó la imagen del ticket: adjúntala en el chat de WhatsApp que se abrió.',
      );
    }
    window.open(waLink(t0.telefono, texto), '_blank', 'noopener');
  }

  const pendientes = lista.filter((t) => t.estadoPago === 'Pendiente').length;

  return (
    <Hoja
      titulo={titulo ?? (varios ? `${lista.length} tickets · N° ${rangos(lista.map((t) => t.numeroTicket))}` : `Ticket N° ${fmtNum(t0.numeroTicket)}`)}
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Carrusel: un ticket por vista, se desliza con el dedo */}
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
          <span className="text-white/50">
            · {t0.metodoPago} · S/ {lista.length * PRECIO}
          </span>
          {varios ? (
            pendientes > 0 ? (
              <PillPago estado="Pendiente" />
            ) : (
              <PillPago estado="Pagado" />
            )
          ) : (
            <>
              <PillPago estado={t0.estadoPago} />
              <PillEntrega estado={t0.estadoEntrega} />
            </>
          )}
        </div>

        <Boton variante="verde" onClick={compartir} disabled={!pngs} className="w-full text-base">
          <Share2 className="h-5 w-5" aria-hidden />
          {!pngs
            ? 'Preparando imágenes…'
            : varios
              ? `Enviar ${lista.length} Tickets por WhatsApp`
              : 'Enviar Ticket por WhatsApp'}
        </Boton>
        <p className="-mt-2 text-xs text-white/50">
          Se abre el menú de compartir: elige WhatsApp y el contacto. {varios ? 'Van todas las imágenes' : 'Va la imagen'} con QR + el
          detalle.
        </p>
        {aviso && <p className="rounded-lg bg-amber-500/15 p-2 text-sm text-amber-200">{aviso}</p>}

        <div className="grid grid-cols-3 gap-2">
          <Boton variante="suave" onClick={() => window.open(waLink(t0.telefono, texto), '_blank', 'noopener')}>
            <MessageCircle className="h-5 w-5" aria-hidden />
            <span className="sr-only">Mensaje directo por WhatsApp</span>
          </Boton>
          <Boton
            variante="suave"
            disabled={!pngs}
            onClick={() => pngs?.forEach((b, i) => setTimeout(() => descargarBlob(b, nombres[i]), i * 350))}
          >
            <Download className="h-5 w-5" aria-hidden />
            <span className="sr-only">Descargar imágenes</span>
          </Boton>
          <Boton variante="suave" onClick={() => window.print()}>
            <Printer className="h-5 w-5" aria-hidden />
            <span className="sr-only">Imprimir</span>
          </Boton>
        </div>
        <div className="-mt-2 grid grid-cols-3 text-center text-[11px] text-white/50">
          <span>Solo texto</span>
          <span>Descargar PNG</span>
          <span>Imprimir</span>
        </div>
      </div>

      {/* Copias fuera de pantalla a 1200px para generar imágenes nítidas */}
      <div aria-hidden className="pointer-events-none fixed left-[-12000px] top-0 w-[1200px]">
        {lista.map((t, i) => (
          <div
            key={t.id}
            ref={(el) => {
              capturas.current[i] = el;
            }}
          >
            <TicketCard ticket={t} />
          </div>
        ))}
      </div>

      {/* Solo visible al imprimir: un ticket debajo de otro (va directo en <body>) */}
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
          <div className="portrait:w-[min(calc(100dvh-2rem),calc((100dvw-2rem)*16/9))] portrait:rotate-90 landscape:w-[min(calc(100dvw-2rem),calc((100dvh-2rem)*16/9))]">
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
