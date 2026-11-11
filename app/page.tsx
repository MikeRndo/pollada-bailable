'use client';

import { useEffect, useState } from 'react';
import { Cloud, HardDrive } from 'lucide-react';
import BottomNav, { type Tab } from '@/components/BottomNav';
import VenderView from '@/components/VenderView';
import ScannerView from '@/components/ScannerView';
import TablaView from '@/components/TablaView';
import CocinaView from '@/components/CocinaView';
import DashboardView from '@/components/DashboardView';
import { TicketsProvider, useTickets } from '@/lib/store';

const TABS: Tab[] = ['vender', 'escaner', 'cocina', 'tabla', 'dashboard'];

export default function Home() {
  return (
    <TicketsProvider>
      <Panel />
    </TicketsProvider>
  );
}

function Panel() {
  const [tab, setTab] = useState<Tab>('vender');
  const { modo, tickets, capacidad } = useTickets();
  const enCola = tickets.filter((t) => t.estadoEntrega === 'PorRecoger').length;

  // Deep link: /#escaner abre directo el escáner (útil para el celular de cocina)
  useEffect(() => {
    const h = window.location.hash.slice(1) as Tab;
    if (TABS.includes(h)) setTab(h);
  }, []);

  const cambiar = (t: Tab) => {
    setTab(t);
    history.replaceState(null, '', `#${t}`);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-noche-950/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4">
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-lg tracking-wide text-oro">Gran Pollada Pro Salud</p>
            <p className="truncate text-xs text-white/55">28 nov · 11:00 AM · DJ Julio</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold tabular-nums">
              {tickets.length}/{capacidad}
            </span>
            <span
              title={modo === 'supabase' ? 'Sincronizado en la nube' : 'Guardado en este celular'}
              className={`grid h-8 w-8 place-items-center rounded-full ${
                modo === 'supabase' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/60'
              }`}
            >
              {modo === 'supabase' ? (
                <Cloud className="h-4 w-4" aria-label="Sincronizado en la nube" />
              ) : (
                <HardDrive className="h-4 w-4" aria-label="Guardado en este celular" />
              )}
            </span>
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-md flex-1 px-4 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)' }}
      >
        {tab === 'vender' && <VenderView />}
        {tab === 'escaner' && <ScannerView />}
        {tab === 'cocina' && <CocinaView />}
        {tab === 'tabla' && <TablaView />}
        {tab === 'dashboard' && <DashboardView />}
      </main>

      <BottomNav tab={tab} onChange={cambiar} enCola={enCola} />
    </div>
  );
}
