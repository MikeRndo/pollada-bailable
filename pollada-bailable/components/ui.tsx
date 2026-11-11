'use client';

import { useEffect, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import type { EstadoEntrega, EstadoPago } from '@/lib/types';

export const inputCls =
  'h-12 w-full rounded-xl border border-white/15 bg-white/[.06] px-4 text-base text-white placeholder:text-white/35 outline-none transition focus:border-oro focus:ring-2 focus:ring-oro/40';

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-noche-800/70 p-4 shadow-lg shadow-black/20 ${className}`}>
      {children}
    </section>
  );
}

export function Segmentado<T extends string>({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  opciones: { value: T; label: string; Icon?: LucideIcon; activo?: string }[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-white/80">{label}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0,1fr))` }}>
        {opciones.map((o) => {
          const act = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={act}
              onClick={() => onChange(o.value)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-[15px] font-bold transition-colors active:scale-[.98] ${
                act
                  ? (o.activo ?? 'border-oro bg-oro text-noche-950')
                  : 'border-white/15 bg-white/[.04] text-white/75 hover:bg-white/10'
              }`}
            >
              {o.Icon && <o.Icon className="h-5 w-5 shrink-0" aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Hoja({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className="max-h-[94dvh] w-full max-w-md animate-subir overflow-y-auto rounded-t-3xl border-t border-white/10 bg-noche-900 px-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/20" aria-hidden />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 active:bg-white/20"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PillPago({ estado }: { estado: EstadoPago }) {
  return estado === 'Pagado' ? (
    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
      Pagado
    </span>
  ) : (
    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
      Por cobrar
    </span>
  );
}

export function PillEntrega({ estado }: { estado: EstadoEntrega }) {
  return estado === 'Entregado' ? (
    <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-bold text-sky-300 ring-1 ring-sky-400/30">
      Entregado
    </span>
  ) : (
    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white/70 ring-1 ring-white/15">
      Por recoger
    </span>
  );
}

export function Boton({
  children,
  onClick,
  variante = 'oro',
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variante?: 'oro' | 'verde' | 'rojo' | 'suave' | 'borde';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const v = {
    oro: 'bg-oro text-noche-950 shadow-lg shadow-oro/20',
    verde: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25',
    rojo: 'bg-rojo text-white',
    suave: 'bg-white/10 text-white',
    borde: 'border border-white/20 text-white',
  }[variante];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 ${v} ${className}`}
    >
      {children}
    </button>
  );
}
