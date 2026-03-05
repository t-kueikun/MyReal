export type MoodId =
  | 'random'
  | 'kawaii'
  | 'cool'
  | 'pop'
  | 'yume'
  | 'natural'
  | 'mystery';

export type MoodOption = {
  id: MoodId;
  label: string;
  prompt: string;
};

export const MOOD_OPTIONS: MoodOption[] = [
  {
    id: 'random',
    label: '🎲 おまかせ',
    prompt: ''
  },
  {
    id: 'kawaii',
    label: '🩷 かわいく',
    prompt: 'ふんわりやさしい雰囲気。パステル調のやわらかい色合いで、まるくてキュートに。'
  },
  {
    id: 'cool',
    label: '😎 かっこよく',
    prompt: '落ち着いたクールな雰囲気。やや渋めの色味で、キリッとした印象に。'
  },
  {
    id: 'pop',
    label: '🌈 ポップに',
    prompt: '元気いっぱいのポップな雰囲気。彩度高めでカラフル、楽しい印象に。'
  },
  {
    id: 'yume',
    label: '✨ ゆめかわ',
    prompt: 'メルヘンで夢のような雰囲気。ラベンダーやミントなど淡い色で幻想的に。'
  },
  {
    id: 'natural',
    label: '🍃 ナチュラル',
    prompt: '自然であたたかい雰囲気。アースカラーで素朴さとやさしさを出す。'
  },
  {
    id: 'mystery',
    label: '🌙 ミステリアス',
    prompt: '不思議でちょっと神秘的な雰囲気。深い色味と夜っぽいトーンで。'
  }
];

const MOOD_MAP = new Map(MOOD_OPTIONS.map((option) => [option.id, option]));

export function resolveMood(id?: string): MoodOption {
  const option = id ? MOOD_MAP.get(id as MoodId) : undefined;
  if (option && option.id !== 'random') return option;
  const pool = MOOD_OPTIONS.filter((mood) => mood.id !== 'random');
  return pool[Math.floor(Math.random() * pool.length)];
}
