const BASE_PROMPT = `かわいい日本のゆるキャラとして仕上げてください。
- シンプルな形、温かい色
- 3DCG風の立体的な質感、ソフトな陰影、透過背景のPNG
- 指定の3色パレットを優先
- かわいく親しみやすい表情`;

export function buildPrompt(palette: string[]) {
  return `${BASE_PROMPT}\nパレット: ${palette.join(', ')}`;
}
