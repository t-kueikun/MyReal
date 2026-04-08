import { MoodOption } from './mood';
import { VariationOption, buildVariationPrompt } from './variation';

const BASE_PROMPT = `入力画像のキャラクターを、BT21やLINEフレンズのようなかわいいゆるキャラに仕上げてください。
- 入力画像の線をそのままなぞったり塗りつぶしたりせず、入力をインスピレーション元として新しいキャラクターをデザインすること
- 入力画像の閉じた線の内側を「塗る場所」と解釈しないこと。線の内側を自動でベタ塗り・面塗りしないこと
- 元の線画の輪郭を下描きや塗り絵の枠として使わないこと。線の中を埋めず、別の形として再構成すること
- かわいい動物・おばけ・生き物のような雰囲気にする
- やわらかく丸みのある輪郭線（太すぎずソフトに）。黒い縁取り(黒アウトライン)は使わず、キャラクターの色に近いやわらかい色の輪郭線にすること
- シンプルで丸みのある形。ディテールは最小限に抑える
- ぬいぐるみやマシュマロのようなソフトな3D立体感を必ず出す。柔らかい陰影・ハイライト・丸みのあるボリューム感を必ず入れること。フラットな塗りにしないこと
- 明るいパステルカラーをベースに
- にこやかで温かみのある表情（にっこり笑顔、ピンクのほっぺ）。絵柄によっては寝顔や手を振るポーズなどバリエーションをつけてもよい
- 丸くぽてっとしたプロポーション
- 背景は必ず真っ白(#FFFFFF)。影や模様は描かない
- 指定の3色パレットをベースカラーとして使用する`;

export function buildPrompt(
  palette: string[],
  mood?: MoodOption,
  variation?: VariationOption
) {
  const moodLine = mood
    ? `\n仕上げムード: ${mood.label}\n- ${mood.prompt}`
    : '';
  const variationLine = variation
    ? `\n変化量: ${variation.label}\n- ${buildVariationPrompt(variation)}`
    : '';
  return `${BASE_PROMPT}${moodLine}${variationLine}\nパレット: ${palette.join(', ')}`;
}

function moodPromptEn(mood?: MoodOption) {
  if (!mood) return 'soft cute finish with balanced contrast';
  const map: Record<string, string> = {
    kawaii: 'soft pastel and sweet gentle look',
    cool: 'calm cool tones with slightly sharp attitude',
    pop: 'bright vivid pop energy',
    yume: 'dreamy pastel fantasy look',
    natural: 'warm earthy and cozy feel',
    mystery: 'deep moody and magical night-like feel'
  };
  return map[mood.id] || 'soft cute finish with balanced contrast';
}

function variationPromptEn(variation?: VariationOption) {
  if (!variation) return 'standard redesign';
  const map: Record<string, string> = {
    subtle: 'keep close to the original motif and silhouette',
    standard:
      'redesign as a new mascot inspired by the input, do not trace lines',
    bold:
      'keep core motif but make bold stylistic changes and add unique features'
  };
  return map[variation.id] || 'standard redesign';
}

export function buildOpenRouterPrompt(
  palette: string[],
  mood?: MoodOption,
  variation?: VariationOption
) {
  const variationJa = variation ? buildVariationPrompt(variation) : '';
  return [
    'Create exactly one mascot character image.',
    'Use the input image only as inspiration; do not trace, do not fill original lines.',
    'Character style: rounded, plush-like, marshmallow soft 3D volume, gentle shading.',
    'Outline rule: no black outlines, use soft outline color close to body color.',
    'Do not draw a stroke/border around the outer silhouette. Avoid dark rim lines on edges.',
    'Background rule: pure white (#FFFFFF), no texture, no shadow, no pattern.',
    'Forbidden: guide lines, dotted lines, measurement lines, triangles, arrows, text, watermark, logo.',
    'Keep the character fully opaque (no accidental transparency holes inside the body).',
    `Color palette (must dominate): ${palette.join(', ')}.`,
    `Mood: ${moodPromptEn(mood)}.`,
    `Variation: ${variationPromptEn(variation)}.`,
    variation ? `Variation detail (ja): ${variationJa}` : '',
    mood ? `Mood detail (ja): ${mood.prompt}` : '',
    'Output: image only.'
  ]
    .filter(Boolean)
    .join('\n');
}
