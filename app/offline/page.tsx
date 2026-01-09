import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="card p-8 space-y-4">
        <h1 className="font-heading text-2xl">オフラインです</h1>
        <p className="text-ink/70">
          撮影したギャラリーは閲覧できます。オンラインに戻ると生成が可能です。
        </p>
        <Link href="/" className="btn btn-primary">
          トップへ
        </Link>
      </div>
    </main>
  );
}
