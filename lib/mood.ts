export type MoodId =
  | 'random'
  | 'pastel'
  | 'vivid'
  | 'retro'
  | 'clay'
  | 'paper'
  | 'neon';

export type MoodOption = {
  id: MoodId;
  label: string;
  prompt: string;
};

export const MOOD_OPTIONS: MoodOption[] = [
  {
    id: 'random',
    label: 'おまかせ (毎回ランダム)',
    prompt: ''
  },
  {
    id: 'pastel',
    label: 'パステル・ふんわり',
    prompt: '淡いパステル調。柔らかい陰影でふんわりした質感。'
  },
  {
    id: 'vivid',
    label: 'ビビッド・ポップ',
    prompt: '彩度高めでポップ。コントラストは少し強め。'
  },
  {
    id: 'retro',
    label: 'レトロ・くすみ',
    prompt: 'くすみカラーでレトロ感。少しざらっとした質感。'
  },
  {
    id: 'clay',
    label: 'クレイ・マット',
    prompt: '粘土のようなマット質感。影は柔らかく控えめ。'
  },
  {
    id: 'paper',
    label: '紙・イラスト',
    prompt: '紙に描いたような風合い。粒子感を少しだけ。'
  },
  {
    id: 'neon',
    label: 'ネオン・サイバー',
    prompt: '発色強めのネオン感。色の輪郭をくっきり。'
  }
];

const MOOD_MAP = new Map(MOOD_OPTIONS.map((option) => [option.id, option]));

export function resolveMood(id?: string): MoodOption {
  const option = id ? MOOD_MAP.get(id as MoodId) : undefined;
  if (option && option.id !== 'random') return option;
  const pool = MOOD_OPTIONS.filter((mood) => mood.id !== 'random');
  return pool[Math.floor(Math.random() * pool.length)];
}
