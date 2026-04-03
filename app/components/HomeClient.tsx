'use client';

import Link from 'next/link';
import { PenTool } from 'lucide-react';

export default function HomeClient({ eventMode }: { eventMode?: boolean }) {
  void eventMode;
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <section className="card w-full max-w-lg p-10 md:p-14 text-center space-y-8 bg-gradient-to-br from-white to-paper-1 shadow-soft-xl border-white">
        <h1 className="font-heading text-4xl md:text-5xl text-ink">AReal</h1>
        <div className="flex items-center justify-center">
          <Link
            href="/draw"
            className="group relative flex h-52 w-full flex-col items-center justify-center overflow-hidden rounded-3xl p-8 text-ink shadow-lift transition-transform duration-300 hover:scale-105 sm:w-96"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[url('/images/site-wallpaper.png')] bg-cover bg-center opacity-95 transition-transform duration-500 group-hover:scale-105"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-white/35 transition-colors duration-300 group-hover:bg-white/24"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-tr from-white/30 via-white/10 to-transparent opacity-70"
            />
            <div className="relative z-10 flex flex-col items-center justify-center drop-shadow-[0_2px_10px_rgba(255,255,255,0.6)]">
              <PenTool size={72} className="mb-4" />
              <span className="font-heading text-3xl">描いてつくる</span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
