# MyReal – AI×ARで“自分だけのゆるキャラ”生成＆撮影

30–60秒で描いた線画からAIがゆるキャラ化し、QRで受け取ってWebAR撮影できる即時デプロイ可能なNext.jsアプリです。

## 特徴
- Google Gemini 画像生成（サーバー側のみ）+ 失敗時フォールバック
- 3Dに見える2Dカード（ビルボード/擬似法線/レイヤーパララックス/影）
- WebXR対応端末はAR、非対応端末は2D合成カメラに自動フォールバック
- 24時間トークン・48時間画像保持・自動削除
- PWA対応、撮影ギャラリーはオフライン閲覧可
- 満足度アンケート + 管理ダッシュボード + CSVエクスポート

---

## セットアップ

```bash
npm install
npm run dev
```

`.env` を作成し、`.env.example` から必要な値を設定してください。

### 主要コマンド
- `npm run dev` 開発
- `npm run build` 本番ビルド
- `npm run start` 本番起動
- `npm run cleanup` 期限切れ削除（cron用）
- `npm run test:unit` Vitest
- `npm run test:e2e` Playwright

---

## 環境変数

`.env.example` を参照してください。キー値は空欄で、**ダミーキーは含みません。**

### 必須 (本番)
- `TOKEN_SECRET` トークン署名用シークレット
- `NEXT_PUBLIC_APP_URL` 本番URL (QR生成に使用)

`TOKEN_SECRET` 未設定時は起動ごとに一時シークレットで動作します (本番では必ず設定してください)。

### Gemini 画像生成
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (例: `gemini-2.0-flash-exp-image-generation`)

※ `GEMINI_API_KEY` 未設定時はローカル簡易スタイル処理へ自動フォールバックします。

### ストレージ (S3互換/R2)
- `STORAGE_PROVIDER=s3`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_URL` (任意: パブリックURLを使う場合)

未設定時は `data/storage` にローカル保存します。
S3/R2側でCORS許可 (`GET`) を設定してください。

### メタデータ/KV
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

未設定時は `data/meta.json` にローカル保存します。
Upstash利用時はキーのTTLで自動削除されます。画像削除はストレージ側のライフサイクル設定も併用してください。

### 運用
- `EVENT_MODE=true` イベントモードON
- `PRIORITY_CODE` 優先コード
- `GEN_CONCURRENCY` 同時生成数
- `RATE_LIMIT_PER_MIN` IPごとの生成回数/分
- `TOKEN_TTL_HOURS` 24推奨
- `IMAGE_RETENTION_HOURS` 48推奨
- `MAINTENANCE_MODE=true` メンテナンス画面

### 管理画面 (Basic Auth)
- `ADMIN_USER`
- `ADMIN_PASS`
設定すると `/admin` と `/api/admin/*` がベーシック認証になります。

### 背景除去 (任意)
- `BACKGROUND_REMOVAL_MODEL_PATH` U2Net onnxモデルのパス

`onnxruntime-node` が利用できない場合は自動で簡易背景除去に切り替わります。
U2NetのONNXモデルは別途入手し、`BACKGROUND_REMOVAL_MODEL_PATH` に配置してください。

---

## 使い方
1. トップページで「描く」または「画像を読み込む」
2. パレットと背景除去を選び「生成する」
3. 生成結果とQRが表示されるので「撮影をはじめる」
4. AR撮影画面で位置・スケールを調整しシャッター

---

## WebAR仕様
- WebXR対応端末: three.js + WebXR
- 非対応端末: 2D合成カメラ (Canvas)
- 3D風2Dカード:
  - ビルボード化
  - 擬似法線 (Sobel + normal map)
  - レイヤーパララックス (簡易セグメント)
  - 影 + ドロップシャドウ
  - 露出補正 + 簡易ボケ

---

## 運用フロー
- トークンは発行から24時間で期限切れ
- 画像は48時間で削除（`npm run cleanup` をcronで実行）

例:
```bash
0 * * * * /usr/bin/node /app/node_modules/.bin/tsx /app/scripts/cleanup.ts
```

---

## デプロイ

### Docker
```bash
docker build -t myreal .
docker run -p 3000:3000 --env-file .env myreal
```

### Fly.io
```bash
fly launch
fly deploy
```

### Render
`render.yaml` でDockerデプロイ可能。

### Cloudflare Pages + Workers
```bash
npm run cf:build
```
Cloudflare Pages のビルド出力に `.vercel/output/static` を指定。

---

## セキュリティ注意
- Geminiキーや優先コードは `.env` 管理し公開しない
- 画像/トークンは期限で削除
- APIはSame-Originチェック + MIME検証
- カメラ利用のため本番はHTTPS必須

---

## 既知の制約
- WebXRはiOS Safariで未対応のため自動で2D合成へフォールバック
- 署名チェックはAPI/ページ側、ミドルウェアでは期限のみチェック
# MyReal
