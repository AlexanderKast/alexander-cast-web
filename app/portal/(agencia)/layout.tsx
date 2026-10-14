import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Portal de clientes · Alexander Cast',
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <header className="border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Alexander Cast</span>
            <span className="text-[10px] uppercase tracking-widest text-white/30 border border-white/10 rounded-full px-2 py-0.5">
              Portal
            </span>
          </Link>
          <form action="/portal/logout" method="post">
            <button
              type="submit"
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}
