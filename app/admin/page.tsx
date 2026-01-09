import { getMetrics } from '../../lib/metrics';
import { listFeedback } from '../../lib/feedback';
import { getQueueStatus } from '../../lib/queue';

export default async function AdminPage() {
  const metrics = await getMetrics();
  const feedback = await listFeedback();
  const queue = getQueueStatus();
  const totalRuns = metrics.generated + metrics.failures;
  const failureRate = totalRuns ? ((metrics.failures / totalRuns) * 100).toFixed(1) : '0';

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <section className="card p-6">
        <h1 className="font-heading text-2xl">運用ダッシュボード</h1>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-ink/10 bg-white p-4">
            <p className="text-sm text-ink/60">生成数</p>
            <p className="text-2xl font-semibold">{metrics.generated}</p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white p-4">
            <p className="text-sm text-ink/60">失敗数 / 率</p>
            <p className="text-2xl font-semibold">
              {metrics.failures} ({failureRate}%)
            </p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white p-4">
            <p className="text-sm text-ink/60">平均生成時間</p>
            <p className="text-2xl font-semibold">{metrics.avgMs}ms</p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-4 text-sm text-ink/70">
          キュー待機数: {queue.pending} / 実行中: {queue.running} / 同時生成数:{' '}
          {queue.concurrency}
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl">アンケート</h2>
          <a href="/api/admin/feedback.csv" className="btn btn-ghost">
            CSVエクスポート
          </a>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-ink/10 bg-white p-4">
            <p className="text-sm text-ink/60">平均満足度</p>
            <p className="text-2xl font-semibold">{metrics.feedbackAvg}</p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white p-4">
            <p className="text-sm text-ink/60">回答数</p>
            <p className="text-2xl font-semibold">{metrics.feedbackCount}</p>
          </div>
        </div>
        <div className="space-y-3">
          {feedback.length === 0 ? (
            <p className="text-sm text-ink/60">まだ回答がありません。</p>
          ) : (
            feedback
              .slice()
              .reverse()
              .slice(0, 20)
              .map((entry, index) => (
                <div
                  key={`${entry.createdAt}-${index}`}
                  className="rounded-2xl border border-ink/10 bg-white p-4 text-sm"
                >
                  <p className="font-semibold">評価: {entry.score}</p>
                  <p className="text-ink/70">{entry.comment || 'コメントなし'}</p>
                  <p className="text-xs text-ink/40">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
          )}
        </div>
      </section>
    </main>
  );
}
