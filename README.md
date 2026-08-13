# smashcat.dev

配信活動の紹介サイト。プロフィール、配信先へのリンク、いただいたファンアートを置く。

Vite + React + TypeScript でビルドし、Cloudflare Workers 上で配信する。

## 開発

```sh
pnpm install
pnpm dev          # Vite の開発サーバ (プロキシは効かない)
pnpm lint
pnpm build        # tsc -b && vite build → dist/
pnpm worker:dev   # ビルドしてから Worker 込みで起動 (プロキシも効く)
```

`/medley-generator/` の動作まで確認したいときは `pnpm dev` ではなく
`pnpm worker:dev` を使う。前者は Vite だけなので Worker のルーティングを通らない。

## 内容の編集

サイトに出る文言・リンク・ファンアートは
[`src/data/profile.ts`](src/data/profile.ts) に集約してある。表示側
(`src/components/`) を触らずに、このファイルだけで更新できる。

`profile.ts` と `index.html` には `TODO` が残っている。配信名義、プロフィール本文、
配信先のURLはプレースホルダのままなので、**公開前に差し替えること**。

### ファンアートを追加する

1. 画像を `public/images/fanart/` に置く
2. `profile.ts` の `fanArt` に1エントリ足す

```ts
{
  src: '/images/fanart/example.jpg',
  artist: '作者名',
  artistUrl: 'https://example.com/artist',
}
```

表示は正方形にトリミングされる (`object-fit: cover`) ので、元画像の縦横比は問わない。
`artist` と `artistUrl` は型で必須にしてある。掲載は作者の許諾を得たものに限ること。

### 必要な画像

| パス | 用途 | 推奨 |
|---|---|---|
| `public/images/avatar.jpg` | ヒーローのアバター、favicon | 正方形・256px 以上 |
| `public/images/ogp.png` | SNS シェア時のカード画像 | 1200×630 |

いずれも未配置。参照は済んでいるので、置けばそのまま表示される。`public/` の中身は
最適化されずそのまま配信されるため、アップロード前に圧縮しておくこと。

## ルーティング

ルートサイトとプロキシを1つの Worker にまとめている。Pages プロジェクトと Worker を
別立てにする構成もあるが、デプロイ先が1つで済むこちらを採用した。

| パス | 挙動 |
|---|---|
| `/medley-generator/*` | GitHub Pages (`naturalclar.github.io`) へプロキシ |
| それ以外 | `dist/` (Vite のビルド成果物) を配信 |

プロキシなので、ブラウザに表示されるURLは `smashcat.dev` のまま変わらない。
リダイレクトではない点が重要で、これによって検索結果にも `smashcat.dev` として出る。

### なぜ単純な転送では動かないか

GitHub Pages は `Host` ヘッダを見て配信サイトを決める。リクエストをそのまま
転送すると `Host: smashcat.dev` が渡り、GitHub Pages はどのサイトを返すべきか
判断できずに 404 を返す。`worker/index.ts` で上流のURLを組み直し、`Host` を
落としているのはこのため。

### パス接頭辞を変えていない理由

medley-generator は `vite.config.ts` で `base: '/medley-generator/'` としてビルド
されている。プロキシ側も同じ `/medley-generator/` で受けているため、ビルド済みの
アセットパス (`/medley-generator/assets/...`) がそのまま解決する。
どちらか一方を変える場合は、もう一方も合わせること。

このサイト自身の `base` は既定 (`/`) のまま。ルート直下で配信するため。

## デプロイ

`main` に push すると、`.github/workflows/ci.yml` の `deploy` ジョブが自動で
配信する。lint と build を通った場合だけ走る。手で流したいときは Actions から
`workflow_dispatch` で起動できる。

必要な secret は以下。リポジトリの Settings → Secrets and variables → Actions
に登録する。

| 名前 | 必須 | 内容 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | 必須 | Workers の編集権限を持つ API トークン |
| `CLOUDFLARE_ACCOUNT_ID` | 任意 | トークンが複数アカウントに紐づく場合のみ |

トークンは Cloudflare ダッシュボードの「My Profile → API Tokens」から、
"Edit Cloudflare Workers" テンプレートで作る。Custom Domain の作成には DNS の
編集権限も要るため、新しいホスト名を足すときに権限不足で落ちたらそこを疑う。

手元から流す場合:

```sh
pnpm run deploy   # build してから wrangler deploy
```

こちらは事前に `wrangler login` が必要。

`run` は省略できない。`pnpm deploy` と書くと pnpm の組み込みコマンド
(ワークスペースのパッケージを書き出すもの) が優先され、スクリプトは走らずに
`ERR_PNPM_CANNOT_DEPLOY` で落ちる。

DNS 側の準備は要らない。ドメインは Cloudflare Registrar で取得しているため
ネームサーバとゾーンは最初から Cloudflare 側にあり、レコードと証明書は
`wrangler.jsonc` の Custom Domain 設定によって deploy 時に自動で作られる。

ゾーンと Worker のデプロイ先が同じアカウントである必要はある。`wrangler login`
で複数アカウントに紐づいている場合はここを取り違えないこと。

## 確認しておくこと

`worker/index.ts` の `MEDLEY_ORIGIN` は `https://naturalclar.github.io` を指している。
このホストは `Naturalclar/naturalclar.github.io` に残っている CNAME (`naturalclar.dev`)
の影響でリダイレクトを返す可能性がある。`redirect: 'follow'` で追従はするが、
実際に 200 を返すオリジンを直接指定した方が一手減る。

```sh
curl -i https://naturalclar.github.io/medley-generator/ | head -20
```

## 関連

- 配信元: [Naturalclar/medley-generator](https://github.com/Naturalclar/medley-generator)
- medley-generator 側の `index.html` には `smashcat.dev` を指す canonical が入っている。
  同じ内容が GitHub Pages 側のURLからも見えるため、正規URLを明示する必要がある。
- OAuth の「承認済みの JavaScript 生成元」は `https://smashcat.dev`。ブラウザが認証を
  行うのはプロキシ先ではなくこちら側。
