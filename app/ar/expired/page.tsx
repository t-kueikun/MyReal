import Link from 'next/link';

export default function ExpiredPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="card p-8 space-y-4">
        <h1 className="font-heading text-2xl">期限切れ</h1>
        <p className="text-ink/70">
          24時間の体験期限が切れました。もう一度つくって体験しよう！
        </p>
        <Link href="/" className="btn btn-primary">
          もう一度つくる
        </Link>
      </div>
    </main>
  );
}
