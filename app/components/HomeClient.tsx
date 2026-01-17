'use client';

import Link from 'next/link';
import { PenTool } from 'lucide-react';

export default function HomeClient({ eventMode }: { eventMode?: boolean }) {
  void eventMode;
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <section className="card w-full max-w-lg p-10 md:p-14 text-center space-y-8 bg-gradient-to-br from-white to-paper-1 shadow-soft-xl border-white">
        <h1 className="font-heading text-4xl md:text-5xl text-ink">MyReal</h1>
        <div className="flex items-center justify-center">
          <Link
            href="/draw"
            className="group relative w-full sm:w-96 h-52 bg-ink rounded-3xl overflow-hidden shadow-lift hover:scale-105 transition-transform duration-300 flex flex-col items-center justify-center text-white p-8"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <PenTool size={72} className="mb-4" />
            <span className="font-heading text-3xl">描いてつくる</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
