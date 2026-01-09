'use client';

import { useState } from 'react';

export default function FeedbackForm({ token }: { token: string }) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, comment, token })
    });
    if (res.ok) setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-4 text-sm text-ink/70">
        ありがとうございました！
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 space-y-3">
      <h3 className="font-heading text-lg">満足度アンケート</h3>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScore(value)}
            className={`btn ${score === value ? 'btn-primary' : 'btn-ghost'}`}
          >
            {value}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        className="w-full rounded-2xl border border-ink/10 p-3 text-sm"
        placeholder="よかったところや改善点を教えてください"
        rows={3}
        maxLength={500}
      />
      <button type="button" className="btn btn-accent" onClick={submit}>
        送信
      </button>
    </div>
  );
}
