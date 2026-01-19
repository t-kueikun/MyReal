'use client';

import { useEffect, useState } from 'react';

const PRESETS = [
  ['#f08f6f', '#f3c969', '#5a9bd8'],
  ['#f7b7a3', '#ffd7a8', '#89b8d8'],
  ['#f28f8f', '#f6d06a', '#7bc1b0']
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
        {PRESETS.map((preset, index) => (
          <button
            key={index}
            type="button"
            onClick={() => update(preset)}
            className="btn btn-ghost"
          >
            <span className="mr-2 inline-flex gap-1">
              {preset.map((color) => (
                <span
                  key={color}
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            パレット{index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
