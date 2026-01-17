'use client';

import Link from 'next/link';
import { PenTool } from 'lucide-react';

export default function HomeClient() {

  return (
    <div className="space-y-12 pb-20">
      <section className="card p-10 md:p-16 animate-floatIn text-center space-y-8 bg-gradient-to-br from-white to-paper-1 shadow-soft-xl border-white">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-widest text-ink/40 font-bold">AI × AR Character Maker</p>
          <h1 className="font-heading text-4xl md:text-6xl text-ink leading-tight">
            MyReal
          </h1>
        </div>

        <div className="flex items-center justify-center">
          <Link href="/draw" className="group relative w-full sm:w-80 h-48 bg-ink rounded-3xl overflow-hidden shadow-lift hover:scale-105 transition-transform duration-300 flex flex-col items-center justify-center text-white p-8">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <PenTool size={64} className="mb-4" />
            <span className="font-heading text-3xl">描いてつくる</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
