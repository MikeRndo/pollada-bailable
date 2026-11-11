'use client';

import type { CSSProperties, ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarDays, Clock, Headphones, HeartPulse, MapPin, Music, Music2 } from 'lucide-react';
import { EVENTO, fmtNum, qrPayload } from '@/lib/evento';
import type { Ticket } from '@/lib/types';

/*
 * Réplica del afiche en formato 16:9. Todas las medidas usan "cqw" (1% del ancho
 * del ticket), así el diseño escala igual en un celular de 360px, en la imagen
 * de 1920px que se comparte por WhatsApp y en la hoja impresa.
 */
const cq = (n: number) => `${n}cqw`;
const ico = (n: number): CSSProperties => ({ width: cq(n), height: cq(n) });

/* Texto con relieve: una capa trasera con borde grueso + sombra, y una capa frontal */
function Texto3D({
  children,
  className = '',
  size,
  frente,
  atras,
  borde,
  relieve,
}: {
  children: ReactNode;
  className?: string;
  size: number;
  frente: CSSProperties;
  atras: string;
  borde: number;
  relieve: string;
}) {
  return (
    <span className={`relative inline-block whitespace-nowrap ${className}`} style={{ fontSize: cq(size) }}>
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ color: atras, WebkitTextStroke: `${cq(borde)} ${atras}`, textShadow: relieve }}
      >
        {children}
      </span>
      <span className="relative" style={frente}>
        {children}
      </span>
    </span>
  );
}

const ORO: CSSProperties = {
  backgroundImage:
    'linear-gradient(180deg,#fffbe0 0%,#ffe14d 28%,#ffc300 52%,#f59e0b 78%,#ffd84d 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextStroke: `${cq(0.18)} #a14b05`,
};

function Rayos({ className, rot = 0 }: { className: string; rot?: number }) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={{ transform: `rotate(${rot}deg)` }} aria-hidden>
      <g stroke="#ffd60a" strokeWidth="4.5" strokeLinecap="round">
        <path d="M20 24 L20 4" />
        <path d="M12 27 L3 13" />
        <path d="M28 27 L37 13" />
      </g>
    </svg>
  );
}

const PERSONAS = Array.from({ length: 22 }, (_, i) => ({
  x: 14 + i * 27 + ((i * 7) % 9),
  top: 70 + ((i * 37) % 45),
  brazos: i % 3,
}));

function Publico({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 600 200" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="pub" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24104f" />
          <stop offset="1" stopColor="#0d0626" />
        </linearGradient>
      </defs>
      <g fill="url(#pub)" stroke="#1b0b42" strokeLinecap="round">
        {PERSONAS.map(({ x, top, brazos }, i) => (
          <g key={i}>
            <circle cx={x} cy={top} r={11} stroke="none" />
            <rect x={x - 16} y={top + 10} width={32} height={200 - top} rx={13} stroke="none" />
            {brazos > 0 && <path d={`M${x - 12} ${top + 18} L${x - 25} ${top - 32}`} strokeWidth={7} fill="none" />}
            {brazos > 1 && <path d={`M${x + 12} ${top + 18} L${x + 27} ${top - 36}`} strokeWidth={7} fill="none" />}
          </g>
        ))}
      </g>
    </svg>
  );
}

function Ecualizador({ className }: { className: string }) {
  const alturas = [30, 55, 40, 75, 50, 90, 60, 100, 70, 85, 45, 65, 35, 55, 25];
  return (
    <svg viewBox="0 0 150 40" preserveAspectRatio="none" className={className} aria-hidden>
      {alturas.map((h, i) => (
        <rect key={i} x={i * 10} y={40 - h * 0.4} width={6} height={h * 0.4} fill="#ffd60a" />
      ))}
    </svg>
  );
}

/* Pollada (pollo + papas + ensalada) y bebidas genéricas, en SVG */
function Comida({ className }: { className: string }) {
  const presa = (
    <>
      <path
        d="M30 140 C22 100 70 78 125 84 C170 89 196 110 190 132 C184 156 120 168 72 162 C48 159 33 152 30 140 Z"
        fill="url(#pollo)"
        stroke="#6b2208"
        strokeWidth="1.5"
      />
      <path
        d="M180 112 C205 98 236 92 252 100 C262 108 252 122 236 123 C220 124 200 130 188 134 Z"
        fill="url(#pollo)"
        stroke="#6b2208"
        strokeWidth="1.5"
      />
      <circle cx="258" cy="101" r="7" fill="#fff4dc" />
      <circle cx="253" cy="113" r="6" fill="#fff4dc" />
      <ellipse cx="95" cy="104" rx="38" ry="9" fill="#fff" opacity=".28" />
      <g fill="#5a1a05" opacity=".45">
        <circle cx="70" cy="125" r="4" />
        <circle cx="110" cy="138" r="3" />
        <circle cx="150" cy="118" r="4" />
        <circle cx="132" cy="150" r="3" />
        <circle cx="215" cy="114" r="3" />
      </g>
    </>
  );
  return (
    <svg viewBox="0 0 560 200" className={className} aria-hidden>
      <defs>
        <radialGradient id="pollo" cx=".45" cy=".35" r=".75">
          <stop offset="0" stopColor="#f8b13a" />
          <stop offset=".45" stopColor="#d9631a" />
          <stop offset="1" stopColor="#7a280b" />
        </radialGradient>
        <linearGradient id="papa" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff07a" />
          <stop offset="1" stopColor="#f2a516" />
        </linearGradient>
        <linearGradient id="madera" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c4a1e" />
          <stop offset="1" stopColor="#2e1a0b" />
        </linearGradient>
        <linearGradient id="cola" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1a0303" />
          <stop offset=".5" stopColor="#4a0d0d" />
          <stop offset="1" stopColor="#140202" />
        </linearGradient>
        <linearGradient id="chela" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9a4a06" />
          <stop offset=".5" stopColor="#f5a623" />
          <stop offset="1" stopColor="#8a3e05" />
        </linearGradient>
      </defs>

      {/* mesa */}
      <rect x="0" y="150" width="560" height="50" fill="url(#madera)" opacity=".95" />
      <path d="M0 168 H560 M0 186 H560" stroke="#000" strokeOpacity=".25" />

      {/* plato */}
      <ellipse cx="200" cy="162" rx="190" ry="34" fill="#cfd2d8" />
      <ellipse cx="200" cy="156" rx="180" ry="29" fill="#fafafa" />

      {/* lechuga */}
      <g fill="#22c55e">
        {[40, 72, 106, 140, 290, 322, 352, 378].map((x, i) => (
          <ellipse key={x} cx={x} cy={136 - (i % 2) * 10} rx="26" ry="15" />
        ))}
      </g>
      <g fill="#15803d" opacity=".7">
        {[56, 120, 306, 366].map((x) => (
          <ellipse key={x} cx={x} cy="132" rx="14" ry="8" />
        ))}
      </g>

      {/* papas fritas */}
      <g transform="translate(222 64)">
        {Array.from({ length: 16 }, (_, i) => {
          const x = i * 8;
          const y = (i % 4) * 6;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width="8"
              height="62"
              rx="2"
              fill="url(#papa)"
              stroke="#c2410c"
              strokeWidth=".6"
              transform={`rotate(${-32 + i * 4} ${x + 4} ${y + 31})`}
            />
          );
        })}
      </g>

      {/* tomates */}
      {[
        [334, 152, 13],
        [374, 144, 12],
        [50, 158, 12],
      ].map(([x, y, r]) => (
        <g key={x}>
          <circle cx={x} cy={y} r={r} fill="#ef4444" stroke="#b91c1c" />
          <circle cx={x} cy={y} r={r * 0.55} fill="#fca5a5" />
        </g>
      ))}

      {/* presas */}
      <g transform="translate(6 -2)">{presa}</g>
      <g transform="translate(92 22) scale(.92)">{presa}</g>

      {/* gaseosa (genérica) */}
      <rect x="427" y="4" width="26" height="12" rx="2" fill="#dc2626" />
      <path
        d="M430 16 L450 16 L452 40 C466 52 470 62 470 74 L470 186 C470 194 464 198 456 198 L424 198 C416 198 410 194 410 186 L410 74 C410 62 414 52 428 40 Z"
        fill="url(#cola)"
      />
      <rect x="410" y="98" width="60" height="40" fill="#dc2626" />
      <path d="M412 122 C430 108 450 132 468 114" stroke="#fff" strokeWidth="3" fill="none" />
      <rect x="416" y="56" width="5" height="128" rx="2" fill="#fff" opacity=".22" />

      {/* cerveza (genérica) */}
      <rect x="500" y="2" width="22" height="10" rx="2" fill="#eab308" />
      <path
        d="M502 12 L520 12 L522 58 C536 70 540 80 540 92 L540 188 C540 195 535 199 528 199 L494 199 C487 199 482 195 482 188 L482 92 C482 80 486 70 500 58 Z"
        fill="url(#chela)"
      />
      <rect x="501" y="30" width="20" height="16" rx="2" fill="#fde68a" />
      <ellipse cx="511" cy="140" rx="26" ry="24" fill="#f8fafc" stroke="#1e3a8a" strokeWidth="2" />
      <circle cx="511" cy="140" r="13" fill="#1d4ed8" />
      <path d="M511 131 L514 138 L521 138 L515 142 L517 149 L511 145 L505 149 L507 142 L501 138 L508 138 Z" fill="#fff" />
      <rect x="488" y="96" width="5" height="88" rx="2" fill="#fff" opacity=".25" />
      <g fill="#fff" opacity=".55">
        {[
          [418, 160],
          [462, 84],
          [452, 170],
          [490, 120],
          [532, 104],
          [528, 176],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />
        ))}
      </g>
    </svg>
  );
}

const LUCES = [
  { l: '2%', r: -24, c: '#60a5fa' },
  { l: '29%', r: 16, c: '#c084fc' },
  { l: '47%', r: -12, c: '#e879f9' },
  { l: '67%', r: 18, c: '#a78bfa' },
  { l: '84%', r: -16, c: '#93c5fd' },
];

const ESTRELLAS = Array.from({ length: 34 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 70,
}));

function Fondo() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse at 18% 0%, rgba(59,130,246,.55), transparent 45%)',
            'radial-gradient(ellipse at 72% 8%, rgba(168,85,247,.6), transparent 50%)',
            'radial-gradient(ellipse at 55% 100%, rgba(236,72,153,.32), transparent 55%)',
            'linear-gradient(160deg,#1c1a6e 0%,#2b0f5e 45%,#0f0830 100%)',
          ].join(','),
        }}
      />
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: ESTRELLAS.map(
            (e) => `radial-gradient(circle at ${e.x}% ${e.y}%, #fff 0 ${cq(0.1)}, transparent ${cq(0.22)})`,
          ).join(','),
        }}
      />
      {LUCES.map((l) => (
        <div key={l.l}>
          <div
            className="absolute top-[-6%] h-[88%] w-[7%] origin-top opacity-40 mix-blend-screen"
            style={{
              left: l.l,
              transform: `rotate(${l.r}deg)`,
              background: `linear-gradient(to bottom, ${l.c}, transparent 85%)`,
              filter: `blur(${cq(1)})`,
            }}
          />
          <div
            className="absolute top-[2%] rounded-full bg-white"
            style={{ left: l.l, ...ico(1.4), boxShadow: `0 0 ${cq(2)} ${cq(1)} ${l.c}` }}
          />
        </div>
      ))}
      <Publico className="absolute left-[38%] right-[9%] top-[24%] h-[36%] opacity-95" />
    </>
  );
}

function Dato({
  Icon,
  label,
  children,
  className,
}: {
  Icon: typeof MapPin;
  label: string;
  children: ReactNode;
  className: string;
}) {
  return (
    <div className={`flex items-center gap-[0.8cqw] ${className}`}>
      <Icon style={ico(3.2)} className="shrink-0 text-[#ffd60a]" strokeWidth={2.4} aria-hidden />
      <div className="flex flex-col leading-[1.05]">
        <span className="text-[#ffd60a]" style={{ fontSize: cq(1.5) }}>
          {label}
        </span>
        {children}
      </div>
    </div>
  );
}

export default function TicketCard({ ticket }: { ticket: Pick<Ticket, 'numeroTicket' | 'firma'> }) {
  const num = fmtNum(ticket.numeroTicket);
  return (
    <div className="w-full [container-type:inline-size]">
      <div
        className="ticket-perf relative aspect-[16/9] w-full select-none overflow-hidden text-white"
        role="img"
        aria-label={`Ticket N° ${num} – ${EVENTO.titulo}, ${EVENTO.fecha}, ${EVENTO.hora}, S/ ${EVENTO.precio}`}
      >
        <Fondo />

        {/* ── Título ─────────────────────────── */}
        <div className="absolute left-[2%] top-[2.5%] z-10 flex w-[50%] flex-col items-center leading-[0.92]">
          <Rayos className="absolute left-[2%] top-[4%] w-[9%]" rot={-35} />
          <Rayos className="absolute right-[4%] top-[2%] w-[9%]" rot={35} />
          <Texto3D
            size={6.2}
            className="font-display"
            frente={{ color: '#fff' }}
            atras="#5b0b0b"
            borde={1}
            relieve={`0 ${cq(0.45)} 0 #3a0606, 0 ${cq(0.8)} ${cq(0.7)} rgba(0,0,0,.6)`}
          >
            GRAN
          </Texto3D>
          <Texto3D
            size={8.6}
            className="font-display tracking-[0.02em]"
            frente={ORO}
            atras="#c1121f"
            borde={1.5}
            relieve={`0 ${cq(0.5)} 0 #7a0a12, 0 ${cq(0.9)} 0 #3d0408, 0 ${cq(1.3)} ${cq(1)} rgba(0,0,0,.65)`}
          >
            POLLADA
          </Texto3D>
          <Texto3D
            size={6.4}
            className="-mt-[0.6cqw] font-script"
            frente={{ color: '#fff' }}
            atras="#b91c1c"
            borde={1}
            relieve={`0 ${cq(0.45)} 0 #450a0a, 0 ${cq(0.8)} ${cq(0.6)} rgba(0,0,0,.55)`}
          >
            Bailable
          </Texto3D>
          <svg viewBox="0 0 200 14" className="-mt-[0.4cqw] w-[44%]" aria-hidden>
            <path d="M4 10 C60 2 140 2 196 8" stroke="#ffd60a" strokeWidth="6" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        {/* ── Comida y bebidas ───────────────── */}
        <Comida className="absolute left-[1.5%] top-[37%] z-[5] h-[36%] w-[57%]" />

        {/* ── Artista invitado ───────────────── */}
        <div className="absolute left-[53%] top-[3%] z-10 flex w-[37%] flex-col items-start">
          <div
            className="brush-amarillo -rotate-[3deg] px-[1.6cqw] py-[0.45cqw] font-cond uppercase leading-none text-[#151515]"
            style={{ fontSize: cq(2.5) }}
          >
            Artista invitado:
          </div>
          <div className="-mt-[0.2cqw] flex items-center gap-[0.6cqw]">
            <div className="brush-rojo -rotate-[3deg] px-[1.8cqw] pb-[0.5cqw] pt-[0.9cqw] leading-none">
              <Texto3D
                size={5}
                className="font-display"
                frente={{ color: '#fff' }}
                atras="#111"
                borde={0.7}
                relieve={`0 ${cq(0.4)} 0 #000`}
              >
                DJ JULIO
              </Texto3D>
            </div>
            <Headphones
              style={ico(5.6)}
              strokeWidth={2.3}
              className="text-zinc-100 drop-shadow-[0_0.3cqw_0.4cqw_rgba(0,0,0,.8)]"
              aria-hidden
            />
          </div>
          <Ecualizador className="ml-[16%] mt-[1cqw] h-[3cqw] w-[56%]" />
        </div>

        <Music2 className="absolute left-[46%] top-[38%] z-10 text-[#ffd60a]" style={ico(3)} aria-hidden />
        <Music className="absolute left-[85%] top-[27%] z-10 text-white" style={ico(2.6)} aria-hidden />

        {/* ── A beneficio de ─────────────────── */}
        <div className="brush-rojo absolute left-[56.5%] top-[49%] z-10 w-[14.5%] -rotate-[4deg] px-[0.9cqw] py-[0.9cqw] text-center">
          <div className="font-cond uppercase leading-none" style={{ fontSize: cq(1.25) }}>
            A beneficio de:
          </div>
          <div className="mt-[0.5cqw] flex items-center justify-center gap-[0.5cqw]">
            <span className="grid shrink-0 place-items-center rounded-full bg-white" style={ico(3.4)}>
              <HeartPulse style={ico(2.4)} className="text-red-600" strokeWidth={2.6} aria-hidden />
            </span>
            <Texto3D
              size={2}
              className="text-left font-display leading-[0.95]"
              frente={{ color: '#fff' }}
              atras="#5c0b0b"
              borde={0.45}
              relieve={`0 ${cq(0.25)} 0 #2a0404`}
            >
              PRO
              <br />
              SALUD
            </Texto3D>
          </div>
        </div>

        {/* ── Datos del evento ───────────────── */}
        <div className="absolute left-[2%] top-[70.5%] z-20 flex h-[15%] w-[67.5%] items-center gap-[0.8cqw] rounded-[0.8cqw] bg-black/60 px-[1.1cqw] font-cond uppercase ring-1 ring-white/10">
          <Dato Icon={MapPin} label="Lugar:" className="w-[42%]">
            <span style={{ fontSize: cq(1.9) }}>{EVENTO.lugar}</span>
            <span style={{ fontSize: cq(1.3) }}>
              Espaldas del colegio
              <br />
              Jorge Basadre
            </span>
          </Dato>
          <span className="h-[70%] w-[0.25cqw] shrink-0 bg-[#ffd60a]" aria-hidden />
          <Dato Icon={CalendarDays} label="Fecha:" className="w-[31%]">
            <span style={{ fontSize: cq(1.65) }}>
              28 de noviembre
              <br />
              del 2026
            </span>
          </Dato>
          <span className="h-[70%] w-[0.25cqw] shrink-0 bg-[#ffd60a]" aria-hidden />
          <Dato Icon={Clock} label="Hora:" className="flex-1">
            <span className="whitespace-nowrap" style={{ fontSize: cq(2.2) }}>
              {EVENTO.hora}
            </span>
          </Dato>
        </div>

        {/* ── ¡No faltes! ────────────────────── */}
        <Rayos className="absolute left-[15%] top-[86.5%] z-20 w-[3.6%]" rot={-70} />
        <Rayos className="absolute left-[71.5%] top-[86.5%] z-20 w-[3.6%]" rot={70} />
        <div className="brush-rojo absolute left-[19.5%] top-[86.5%] z-20 flex h-[12%] w-[51%] items-center justify-center">
          <Texto3D
            size={4.1}
            className="-mt-[0.6cqw] font-script leading-none"
            frente={{ color: '#fff' }}
            atras="#450a0a"
            borde={0.6}
            relieve={`0 ${cq(0.35)} 0 #250303`}
          >
            ¡No faltes!
          </Texto3D>
        </div>

        {/* ── QR TM + número correlativo ─────── */}
        <div className="absolute left-[72%] top-[38.5%] z-20 flex h-[43%] w-[17%] flex-col items-center justify-between rounded-[1cqw] border-[0.5cqw] border-[#ffd60a] bg-white p-[0.6cqw] text-black shadow-[0_0_2cqw_rgba(0,0,0,.6)]">
          <span className="font-cond leading-none" style={{ fontSize: cq(2.1) }}>
            QR TM
          </span>
          <QRCodeSVG
            value={qrPayload(ticket)}
            level="M"
            marginSize={0}
            bgColor="#ffffff"
            fgColor="#000000"
            style={{ width: cq(11.4), height: cq(11.4) }}
          />
          <div className="w-full rounded-[0.5cqw] bg-[#e11d2e] py-[0.3cqw] text-center leading-none text-white">
            <span className="block font-cond" style={{ fontSize: cq(1.1) }}>
              TICKET N°
            </span>
            <span className="font-display" style={{ fontSize: cq(2.9) }}>
              {num}
            </span>
          </div>
        </div>

        {/* ── Talón: número + precio ─────────── */}
        <div className="absolute inset-y-0 left-[90.2%] right-0 bg-gradient-to-b from-indigo-950/30 to-black/40" />
        <div className="absolute inset-y-0 left-[90.2%] border-l-[0.25cqw] border-dashed border-white/70" />
        <div className="absolute left-[90.2%] right-0 top-[4%] flex h-[33%] items-center justify-center">
          <span
            className="rotate-180 font-display text-[#ffd60a] [writing-mode:vertical-rl]"
            style={{ fontSize: cq(2.3) }}
          >
            N° {num}
          </span>
        </div>
        <div className="absolute left-[91%] right-[1.6%] top-[40%] flex h-[50%] flex-col items-center justify-center bg-[#ffd60a] font-cond leading-none text-[#161616] [clip-path:polygon(0_5%,100%_0,100%_95%,0_100%)]">
          <span style={{ fontSize: cq(2.3) }}>S/.</span>
          <Texto3D
            size={4.5}
            className="my-[0.4cqw] font-display"
            frente={{ color: '#e11d2e' }}
            atras="#3b0505"
            borde={0.45}
            relieve={`0 ${cq(0.3)} 0 #1c0202`}
          >
            15
          </Texto3D>
          <span style={{ fontSize: cq(1.9) }}>SOLES</span>
          <span className="mt-[0.6cqw] h-[0.5cqw] w-[70%] -rotate-6 rounded-full bg-[#e11d2e]" />
        </div>
      </div>
    </div>
  );
}
