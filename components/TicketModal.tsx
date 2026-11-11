'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toBlob } from 'html-to-image';
import { ChevronLeft, ChevronRight, Download, Maximize2, MessageCircle, Printer, Share2, X } from 'lucide-react';
import TicketCard, { PLANTILLA } from './TicketCard';
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
      // Espera a que el afiche y las fuentes estén listos antes de "fotografiar" el ticket
      await document.fonts?.ready;
      const img = new Image();
      img.src = PLANTILLA.src;
      await img.decode().catch(() => {});
      await new Promise((r) => setTimeout(r, 250));
      const out: Blob[] = [];
      for (let i = 0; i < lista.length; i++) {
        const nodo = capturas.current[i];
        if (!nodo) return;
        // Copia a 1536 px = tamaño real del afiche → imagen nítida, sin reescalar
        const b = await toBlob(nodo, { pixelRatio: lista.length > 6 ? 0.75 : 1, quality: 0.95 });
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

  /** Abre el chat del número registrado (así aparece primero al compartir) */
  function abrirChat() {
    window.open(waLink(t0.telefono, ''), '_blank', 'noopener');
  }

  /** Envía la(s) imagen(es) del ticket con QR + el mensaje, juntos, por WhatsApp */
  async function enviarTicket() {
    setAviso(null);
    if (!pngs || !pngs.length) return;
    const archivos = pngs.map((b, i) => new File([b], nombres[i], { type: 'image/png' }));
    if (navigator.canShare?.({ files: archivos, text: texto })) {
      try {
        // Igual que la versión que salía agrupada: imágenes + texto (como pie de foto) + título
        await navigator.share({ files: archivos, text: texto, title: 'Tickets Gran Pollada Pro Salud' });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return;
      }
    }
    // PC o navegador sin compartir archivos: descarga las imágenes y abre el chat con el mensaje
    pngs.forEach((b, i) => setTimeout(() => descargarBlob(b, nombres[i]), i * 350));
    window.open(waLink(t0.telefono, texto), '_blank', 'noopener');
    setAviso(
      varios
        ? `Se descargaron ${pngs.length} imágenes y se abrió el chat: adjúntalas antes de enviar.`
        : 'Se descargó la imagen y se abrió el chat: adjúntala antes de enviar.',
    );
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

        <Boton variante="verde" onClick={enviarTicket} disabled={!pngs} className="w-full text-base">
          <Share2 className="h-5 w-5" aria-hidden />
          {!pngs ? 'Preparando ticket…' : varios ? `Enviar ${lista.length} tickets por WhatsApp` : 'Enviar ticket por WhatsApp'}
        </Boton>
        <p className="-mt-2 text-xs text-white/55">
          Va {varios ? 'cada ticket con su QR' : 'la imagen del ticket con su QR'} + el mensaje. Elige <b>WhatsApp</b> y el
          chat de <b>{t0.comprador.split(' ')[0]}</b> ({t0.telefono}).
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

        <div className="grid grid-cols-2 gap-2">
          <Boton
            variante="suave"
            disabled={!pngs}
            onClick={() => pngs?.forEach((b, i) => setTimeout(() => descargarBlob(b, nombres[i]), i * 350))}
          >
            <Download className="h-5 w-5" aria-hidden /> Descargar PNG
          </Boton>
          <Boton variante="suave" onClick={() => window.print()}>
            <Printer className="h-5 w-5" aria-hidden /> Imprimir
          </Boton>
        </div>
      </div>

      {/* Copias fuera de pantalla al tamaño real del afiche para generar imágenes nítidas */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-[-20000px] top-0"
        style={{ width: PLANTILLA.ancho }}
      >
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
