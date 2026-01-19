export type VariationId = 'subtle' | 'standard' | 'bold';

export type VariationOption = {
  id: VariationId;
  label: string;
  prompt: string;
};

export const VARIATION_OPTIONS: VariationOption[] = [
  {
    id: 'subtle',
    label: '控えめ',
    prompt: 'シルエットと主要な特徴は忠実に保ち、細部だけ少し変える。'
  },
  {
    id: 'standard',
    label: 'ふつう',
    prompt: 'シルエットは維持しつつ、模様・表情・質感を変えて個性を出す。'
  },
  {
    id: 'bold',
    label: '大きく',
    prompt: 'シルエットを保ちながら大胆にアレンジし、独自の小物や特徴を追加。'
  }
];

const VARIATION_MAP = new Map(
  VARIATION_OPTIONS.map((option) => [option.id, option])
);

const EXTRA_FEATURES = [
  '帽子やヘアアクセ',
  '小さなバッグや道具',
  '模様やストライプ',
  '耳やしっぽの形',
  '目の形やハイライト',
  '素材感(フェルト/クレイ/布)',
  '服のシルエット'
];

function pickExtras(count: number) {
  const pool = [...EXTRA_FEATURES];
  const picked: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

export function resolveVariation(id?: string): VariationOption {
  const option = id ? VARIATION_MAP.get(id as VariationId) : undefined;
  return option ?? VARIATION_MAP.get('standard')!;
}

export function buildVariationPrompt(option: VariationOption) {
  if (option.id === 'subtle') return option.prompt;
  const extras = pickExtras(option.id === 'bold' ? 2 : 1);
  return extras.length > 0
    ? `${option.prompt} 追加要素: ${extras.join('、')}。`
    : option.prompt;
}
