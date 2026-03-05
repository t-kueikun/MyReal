'use client';

import { useEffect, useState } from 'react';

const PRESETS: { name: string; colors: string[] }[] = [
  { name: '🍑 ピーチ', colors: ['#f8a4b8', '#ffd1a9', '#ffe8cc'] },
  { name: '🌊 オーシャン', colors: ['#5b9bd5', '#7ec8e3', '#c8e6f5'] },
  { name: '🍀 フォレスト', colors: ['#6db889', '#a8d5a2', '#f2e8c9'] },
  { name: '🍋 レモン', colors: ['#ffe066', '#ffb347', '#ff6b6b'] },
  { name: '🫐 ベリー', colors: ['#b07cc6', '#e88fb4', '#fccde2'] },
  { name: '🧊 アイス', colors: ['#a8d8ea', '#cbaacb', '#ffffba'] },
  { name: '🍫 チョコ', colors: ['#8b6f47', '#d4a574', '#f5e6d0'] },
  { name: '🌸 さくら', colors: ['#fbb5c0', '#f9e4e4', '#d4eaf7'] },
  { name: '🔥 サンセット', colors: ['#ff6b6b', '#ff9a56', '#ffd93d'] },
  { name: '🌙 ミッドナイト', colors: ['#2d3561', '#6b5b95', '#b8a9c9'] },
];

export default function PalettePicker({
  value,
  onChange
}: {
  value: string[];
  onChange: (colors: string[]) => void;
}) {
  const [colors, setColors] = useState(value);

  useEffect(() => {
    setColors(value);
  }, [value]);

  const update = (next: string[]) => {
    setColors(next);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {colors.map((color, index) => (
          <label key={index} className="flex items-center gap-2">
            <span className="text-sm text-ink/70">色{index + 1}</span>
            <input
              type="color"
              value={color}
              onChange={(event) => {
                const next = [...colors];
                next[index] = event.target.value;
                update(next);
              }}
              className="h-10 w-14 cursor-pointer rounded-xl border border-ink/10 bg-white"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => update(preset.colors)}
            className="btn btn-ghost text-xs"
          >
            <span className="mr-1.5 inline-flex gap-0.5">
              {preset.colors.map((color) => (
                <span
                  key={color}
                  className="h-3 w-3 rounded-full border border-ink/5"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}
