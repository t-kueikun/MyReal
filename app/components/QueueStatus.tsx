'use client';

import { useEffect, useState } from 'react';

type QueueInfo = {
  size: number;
  pending: number;
  running: number;
  concurrency: number;
  eventMode: boolean;
};

export default function QueueStatus() {
  const [info, setInfo] = useState<QueueInfo | null>(null);

  useEffect(() => {
    let active = true;
    const fetchInfo = async () => {
      try {
        const res = await fetch('/api/queue');
        if (!res.ok) return;
        const json = (await res.json()) as QueueInfo;
        if (active) setInfo(json);
      } catch {
        // ignore
      }
    };
    fetchInfo();
    const id = setInterval(fetchInfo, 4000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (!info?.eventMode) return null;

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 text-sm">
      <p className="font-semibold">イベントモード稼働中</p>
      <p className="text-ink/70">
        現在の待ち人数: <span className="font-semibold">{info.pending}</span>
      </p>
      <p className="text-ink/70">
        同時生成数: <span className="font-semibold">{info.concurrency}</span>
      </p>
    </div>
  );
}
