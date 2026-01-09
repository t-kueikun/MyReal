'use client';

import { useState } from 'react';

const MAX_MB = 18;

export default function ImageUploader({
  onSelect
}: {
  onSelect: (file: File | null) => void;
}) {
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`ファイルサイズは${MAX_MB}MBまでです。`);
      onSelect(null);
      return;
    }
    setError('');
    setPreview(URL.createObjectURL(file));
    onSelect(file);
  };

  return (
    <div className="space-y-3">
      <label className="btn btn-ghost inline-flex items-center gap-2 cursor-pointer">
        画像を読み込む
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {preview ? (
        <div className="card p-3">
          <img
            src={preview}
            alt="読み込んだ画像"
            className="w-full rounded-2xl"
          />
        </div>
      ) : null}
    </div>
  );
}
