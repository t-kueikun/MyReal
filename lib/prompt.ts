import { MoodOption } from './mood';
import { VariationOption, buildVariationPrompt } from './variation';

const BASE_PROMPT = `入力画像のキャラクターを、BT21やLINEフレンズのようなかわいいゆるキャラに仕上げてください。
- かわいい動物・おばけ・生き物のような雰囲気にする
- やわらかく丸みのある輪郭線（太すぎずソフトに）
- シンプルで丸みのある形。ディテールは最小限に抑える
- ぬいぐるみのようなソフトな立体感を出す（柔らかい陰影とハイライト）
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
