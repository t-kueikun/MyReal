import HomeClient from './components/HomeClient';
import { env } from '../lib/config';
import Link from 'next/link';

export default function HomePage() {
  if (env.maintenanceMode) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="card p-8 space-y-6">
          <h1 className="font-heading text-3xl">
            現在メンテナンス中です
          </h1>
          <p className="text-ink/70">
            会場での体験準備のため一時停止しています。
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/demo" className="btn btn-accent">
              オンライン体験版
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <HomeClient />
    </main>
  );
}
