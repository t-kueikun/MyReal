'use client';

import { useState } from 'react';

const PRESETS = [
  ['#f08f6f', '#f3c969', '#5a9bd8'],
  ['#f7b7a3', '#ffd7a8', '#89b8d8'],
  ['#f28f8f', '#f6d06a', '#7bc1b0'],
  ['#88d8b0', '#ff6b6b', '#ffe66d'],
];

export default function PalettePicker({
  value,
  onChange
}: {
  value: string[];
  onChange: (colors: string[]) => void;
}) {
  const [colors, setColors] = useState(value);

  const update = (next: string[]) => {
    setColors(next);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Current Palette Swatches */}
      <div className="grid grid-cols-3 gap-3">
        {colors.map((color, index) => (
          <label key={index} className="relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-ink/10 bg-white shadow-sm transition-transform active:scale-95 hover:border-accent">
            <input
              type="color"
              value={color}
              onChange={(event) => {
                const next = [...colors];
                next[index] = event.target.value;
                update(next);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div
              className="h-12 w-12 rounded-full shadow-inner ring-1 ring-black/5"
              style={{ backgroundColor: color }}
            />
            <span className="mt-2 text-xs font-bold text-ink/50">C{index + 1}</span>
          </label>
        ))}
      </div>

      <div className="border-t border-ink/5 pt-4">
        <p className="mb-3 text-xs font-bold text-ink/40">PRESETS</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset, index) => (
            <button
              key={index}
              type="button"
              onClick={() => update(preset)}
              className="group relative flex h-14 items-center justify-center rounded-xl bg-paper-2 border border-transparent transition-all hover:border-accent hover:shadow-md active:scale-95"
            >
              <div className="flex -space-x-2">
                {preset.map((color) => (
                  <div
                    key={color}
                    className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
