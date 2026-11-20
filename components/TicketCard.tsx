'use client';

/* eslint-disable @next/next/no-img-element */
import { QRCodeSVG } from 'qrcode.react';
import { fmtNum, qrPayload } from '@/lib/evento';
import type { Ticket } from '@/lib/types';

/*
 * Ticket = afiche original (public/ticket-base.jpg) SIN modificar + 2 capas encima:
 *   1) Código QR único del ticket
 *   2) Número correlativo "N° 042"
 *
 * Medidas tomadas pixel a pixel del afiche (1536 × 1024 px).
 * Recuadro blanco "QR TM": x 1067→1325, y 402→698.
 */
export const PLANTILLA = {
  src: '/ticket-base.jpg',
  ancho: 1536,
  alto: 1024,
} as const;

export const CAJA = { x: 1067, y: 402, w: 258, h: 296 };
const pct = (v: number, total: number) => `${(v / total) * 100}%`;

/** Relación de aspecto del afiche (ancho / alto) */
export const ASPECTO = PLANTILLA.ancho / PLANTILLA.alto;

type DatosTicket = Pick<Ticket, 'numeroTicket' | 'firma'>;

export default function TicketCard({
  ticket,
  onLoad,
}: {
  ticket: DatosTicket;
  /** Se llama cuando la imagen del afiche terminó de cargar (útil para capturar el PNG) */
  onLoad?: () => void;
}) {
  const num = fmtNum(ticket.numeroTicket);

  return (
    <div
      className="relative block h-auto w-full select-none overflow-hidden rounded-lg shadow-xl [container-type:inline-size]"
      style={{ aspectRatio: `${PLANTILLA.ancho} / ${PLANTILLA.alto}` }}
      role="img"
      aria-label={`Ticket N° ${num} – Gran Pollada Pro Salud`}
    >
      {/* Afiche original, tal cual */}
      <img
        src={PLANTILLA.src}
        alt=""
        width={PLANTILLA.ancho}
        height={PLANTILLA.alto}
        draggable={false}
        onLoad={onLoad}
        className="absolute inset-0 h-full w-full"
      />

      {/* Capa sobre el recuadro blanco "QR TM" */}
      <div
        className="absolute flex flex-col items-center justify-between bg-white"
        style={{
          left: pct(CAJA.x, PLANTILLA.ancho),
          top: pct(CAJA.y, PLANTILLA.alto),
          width: pct(CAJA.w, PLANTILLA.ancho),
          height: pct(CAJA.h, PLANTILLA.alto),
          padding: '0.9cqw 0.9cqw 0.7cqw',
        }}
      >
        <QRCodeSVG
          value={qrPayload(ticket)}
          level="H"
          marginSize={0}
          bgColor="#ffffff"
          fgColor="#000000"
          style={{ width: '13.4cqw', height: '13.4cqw', display: 'block' }}
        />

        <div
          className="flex w-full items-center justify-center rounded-[0.5cqw] bg-[#d7141f] leading-none"
          style={{ paddingBlock: '0.45cqw', boxShadow: 'inset 0 -0.3cqw 0 rgba(0,0,0,.25)' }}
        >
          <span
            className="font-display tracking-wider text-white"
            style={{
              fontSize: '2.75cqw',
              WebkitTextStroke: '0.12cqw #5a0006',
              textShadow: '0 0.2cqw 0 #5a0006',
            }}
          >
            N° {num}
          </span>
        </div>
      </div>
    </div>
  );
}
