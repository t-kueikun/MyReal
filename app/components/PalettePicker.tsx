'use client';

export type PalettePreset = {
  id: string;
  name: string;
  colors: string[];
};

export const PALETTE_PRESETS: PalettePreset[] = [
  { id: 'peach', name: '🍑 ピーチ', colors: ['#f8a4b8', '#ffd1a9', '#ffe8cc'] },
  { id: 'ocean', name: '🌊 オーシャン', colors: ['#5b9bd5', '#7ec8e3', '#c8e6f5'] },
  { id: 'forest', name: '🍀 フォレスト', colors: ['#6db889', '#a8d5a2', '#f2e8c9'] },
  { id: 'lemon', name: '🍋 レモン', colors: ['#ffe066', '#ffb347', '#ff6b6b'] },
  { id: 'berry', name: '🫐 ベリー', colors: ['#b07cc6', '#e88fb4', '#fccde2'] },
  { id: 'ice', name: '🧊 アイス', colors: ['#a8d8ea', '#cbaacb', '#ffffba'] },
  { id: 'choco', name: '🍫 チョコ', colors: ['#8b6f47', '#d4a574', '#f5e6d0'] },
  { id: 'sakura', name: '🌸 さくら', colors: ['#fbb5c0', '#f9e4e4', '#d4eaf7'] },
  { id: 'sunset', name: '🔥 サンセット', colors: ['#ff6b6b', '#ff9a56', '#ffd93d'] },
  { id: 'midnight', name: '🌙 ミッドナイト', colors: ['#2d3561', '#6b5b95', '#b8a9c9'] },
];

function isSamePalette(left: string[], right: string[]) {
  return left.length === right.length && left.every((color, index) => color === right[index]);
}

export default function PalettePicker({
  value,
  onChange,
  presetsOnly = false
}: {
  value: string[];
  onChange: (colors: string[]) => void;
  presetsOnly?: boolean;
}) {
  const activePreset =
    PALETTE_PRESETS.find((preset) => isSamePalette(preset.colors, value)) ?? null;

  return (
    <div className="space-y-1.5">
      {!presetsOnly ? (
        <div className="flex flex-wrap gap-2">
          {value.map((color, index) => (
            <label key={index} className="flex items-center gap-2">
              <span className="text-sm text-ink/70">色{index + 1}</span>
              <input
                type="color"
                value={color}
                onChange={(event) => {
                  const next = [...value];
                  next[index] = event.target.value;
                  onChange(next);
                }}
                className="h-10 w-14 cursor-pointer rounded-xl border border-ink/10 bg-white"
              />
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink/50">3色セットのプリセットから選べます。</p>
      )}

      {presetsOnly ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {PALETTE_PRESETS.map((preset) => {
            const selected = isSamePalette(preset.colors, value);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onChange(preset.colors);
                }}
                className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                  selected
                    ? 'border-accent bg-accent/10 shadow-sm'
                    : 'border-ink/10 bg-white hover:bg-ink/5'
                }`}
              >
                <span className="mb-1.5 inline-flex gap-1">
                  {preset.colors.map((color) => (
                    <span
                      key={color}
                      className="h-4 w-4 rounded-full border border-ink/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="block text-sm font-semibold text-ink">{preset.name}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {PALETTE_PRESETS.map((preset) => {
            const selected = isSamePalette(preset.colors, value);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange(preset.colors)}
                className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                  selected
                    ? 'border-accent bg-accent/10 shadow-sm'
                    : 'border-ink/10 bg-white hover:bg-ink/5'
                }`}
              >
                <span className="mb-1.5 inline-flex gap-1">
                  {preset.colors.map((color) => (
                    <span
                      key={color}
                      className="h-4 w-4 rounded-full border border-ink/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="block text-sm font-semibold text-ink">{preset.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {!presetsOnly && activePreset ? (
        <p className="text-xs text-ink/50">選択中: {activePreset.name}</p>
      ) : null}
    </div>
  );
}
