'use client';

import { LayoutDashboard, ScanLine, TableProperties, Ticket } from 'lucide-react';

export type Tab = 'vender' | 'escaner' | 'tabla' | 'dashboard';

const ITEMS = [
  { id: 'vender', label: 'Vender', Icon: Ticket },
  { id: 'escaner', label: 'Escáner', Icon: ScanLine },
  { id: 'tabla', label: 'Tabla', Icon: TableProperties },
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
] as const;

export default function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-noche-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ id, label, Icon }) => {
          const act = tab === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={act ? 'page' : undefined}
                className={`relative flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                  act ? 'text-oro' : 'text-white/55 active:text-white'
                }`}
              >
                {act && <span className="absolute top-0 h-1 w-10 rounded-b-full bg-oro" aria-hidden />}
                <span
                  className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${act ? 'bg-oro/15' : ''}`}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={act ? 2.5 : 2} aria-hidden />
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
