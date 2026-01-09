import dynamic from 'next/dynamic';

const ARClient = dynamic(() => import('../components/ARClient'), {
  ssr: false
});

const demoSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="transparent" />
  <circle cx="256" cy="240" r="150" fill="#f7b7a3" />
  <circle cx="206" cy="220" r="20" fill="#101114" />
  <circle cx="306" cy="220" r="20" fill="#101114" />
  <path d="M200 290 Q256 330 312 290" stroke="#101114" stroke-width="14" fill="none" stroke-linecap="round" />
  <circle cx="170" cy="140" r="40" fill="#f3c969" />
  <circle cx="342" cy="140" r="40" fill="#5a9bd8" />
</svg>
`);

export default function DemoPage() {
  const imageUrl = `data:image/svg+xml,${demoSvg}`;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="card p-6">
        <h1 className="font-heading text-2xl">オンライン体験版</h1>
        <p className="text-ink/70">
          サンプルキャラクターでAR撮影を体験できます。
        </p>
      </div>
      <ARClient imageUrl={imageUrl} token="demo" />
    </main>
  );
}
