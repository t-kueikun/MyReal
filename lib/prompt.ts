import { MoodOption } from './mood';

const BASE_PROMPT = `かわいい日本のゆるキャラとして仕上げてください。
- シンプルな形、温かい色
- 3DCG風の立体的な質感、ソフトな陰影
- 背景は必ず真っ白(#FFFFFF)にしてください。影や模様は描かないでください。
- 指定の3色パレットをベースに、ムードに合わせた濃淡や補助色を少量追加してよい
- かわいく親しみやすい表情`;

export function buildPrompt(palette: string[], mood?: MoodOption) {
  const moodLine = mood
    ? `\n仕上げムード: ${mood.label}\n- ${mood.prompt}`
    : '';
  return `${BASE_PROMPT}${moodLine}\nパレット: ${palette.join(', ')}`;
}
