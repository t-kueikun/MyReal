import Link from 'next/link';
import dynamic from 'next/dynamic';
import { verifyToken } from '../../../lib/token';
import { getMeta } from '../../../lib/metadata';
import { getImageUrl } from '../../../lib/storage';

const ARClient = dynamic(() => import('../../components/ARClient'), {
  ssr: false
});

export default async function ArPage({
  params
}: {
  params: { token: string };
}) {
  const verify = verifyToken(params.token);
  if (!verify.valid) {
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

  const meta = await getMeta(params.token);
  if (!meta) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="card p-8 space-y-4">
          <h1 className="font-heading text-2xl">見つかりませんでした</h1>
          <Link href="/" className="btn btn-primary">
            もう一度つくる
          </Link>
        </div>
      </main>
    );
  }

  const imageUrl = await getImageUrl(meta.imageKey, 3600);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="card p-6">
        <h1 className="font-heading text-2xl">AR撮影</h1>
        <p className="text-ink/70">
          スケールや角度を調整して、シャッターを押してください。
        </p>
      </div>
      <ARClient imageUrl={imageUrl} token={params.token} />
    </main>
  );
}
