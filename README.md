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
| `public/images/ogp.png` | SNS シェア時のカード画像 | 1200×630 (生成する) |

いずれも未配置。参照は済んでいるので、置けばそのまま表示される。`public/` の中身は
最適化されずそのまま配信されるため、アップロード前に圧縮しておくこと。

`ogp.png` は手で作らず、下の手順で生成する。

### OGP 画像を作る

左に名義と紹介文、右に一枚絵を並べたカードを Playwright で撮る。

```sh
pnpm exec playwright install chromium   # 初回のみ
pnpm run ogp                            # → public/images/ogp.png
```

一枚絵は `ogp/art.png` に置く (`.jpg` / `.jpeg` / `.webp` も可)。縦横比は問わない。
枠に対して `cover` で入るため、中央から外れた位置に主題があると切れる。
置かずに実行すると、右側がプレースホルダのまま出力される。レイアウトの確認用。

**現在の `ogp/art.png` は仮のグラデーション画像。** 実際の一枚絵に差し替えて
`pnpm run ogp` を流し直すこと。

文言は `src/data/profile.ts` の `name` と `tagline` から読む。テンプレート
(`ogp/template.html`) 側に名義を書かないこと。プロフィールを変えたら
`pnpm run ogp` を流し直して、生成された `public/images/ogp.png` をコミットする。

配色は `src/index.css` のライトテーマと同じ値をテンプレートに直書きしてある。
サイト側の色を変えたときは合わせること。

使うフォントは実行するマシンに入っているものに依存する (macOS なら Hiragino Sans、
Linux なら Noto Sans JP や IPAGothic)。**環境が違うと字形と行の折れ方が変わる**ので、
差し替えるときは生成結果を目で確認する。

すでにどこかにある Chromium を使わせたい場合は `OGP_CHROMIUM_PATH` にその実行
ファイルを指定する。`playwright install` を省ける。

## ルーティング

ルートサイトとプロキシを1つの Worker にまとめている。Pages プロジェクトと Worker を
別立てにする構成もあるが、デプロイ先が1つで済むこちらを採用した。

| パス | 挙動 |
|---|---|
| `/medley-generator/*` | GitHub Pages (`naturalclar.github.io`) へプロキシ |
| `/avvy-deco*` | Vercel (`avvy-deco.vercel.app`) へプロキシ |
| それ以外 | `dist/` (Vite のビルド成果物) を配信 |

プロキシなので、ブラウザに表示されるURLは `smashcat.dev` のまま変わらない。
リダイレクトではない点が重要で、これによって検索結果にも `smashcat.dev` として出る。

### プロキシ先の追加

接頭辞ごとの振る舞いは `worker/index.ts` の `PROXY_TARGETS` に持たせてある。
上流の作法が配信元によって違うため、フラグで吸収する形にしている。

| | medley-generator (GitHub Pages) | avvy-deco (Vercel / Next) |
|---|---|---|
| `normalizeTrailingSlash` | `true` | `false` |
| `dropLocation` | `true` | `false` |

**`normalizeTrailingSlash`** は `/prefix` を `/prefix/` に寄せる。Vite の成果物は
アセットを相対で解決するため、末尾スラッシュが無いと一つ上の階層を見に行く。
Next は basePath 込みの絶対URLを吐くので不要で、むしろ `/prefix/` → `/prefix` の
308 を自分で返す。両方を有効にすると逆向きのリダイレクトがぶつかる。

**`dropLocation`** は上流の `Location` を落とす。落とすのは、ブラウザが上流のURLへ
出ていって smashcat.dev のまま見せる目的が崩れるのを防ぐため。ただし上流自身の
正当なリダイレクト (Next の basePath 正規化など) まで消すと、行き先の無い 308 に
なってページが出ない。残す側でも、上流オリジンを指す絶対URLはこちらのホストに
書き換えている。

### なぜ単純な転送では動かないか

GitHub Pages も Vercel も `Host` ヘッダを見て配信サイトを決める。リクエストを
そのまま転送すると `Host: smashcat.dev` が渡り、上流はどのサイトを返すべきか
判断できずに 404 を返す。`worker/index.ts` で上流のURLを組み直し、`Host` を
落としているのはこのため。

### パス接頭辞を変えていない理由

接頭辞は、配信側がビルド時に埋め込んでいるパスと一致していなければならない。

- medley-generator — `vite.config.ts` の `base: '/medley-generator/'`
- avvy-deco — Next の `basePath: '/avvy-deco'`

一致しているからこそ、ビルド済みのアセットパス (`/medley-generator/assets/...`、
`/avvy-deco/_next/...`) がそのまま解決する。どちらか一方を変える場合は、もう一方も
合わせること。

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
の影響で **301 を返す**。実測値:

```
$ curl -i https://naturalclar.github.io/medley-generator/
HTTP/2 301
location: https://naturalclar.dev/medley-generator/
```

`redirect: 'follow'` が追従するので動作はしているが、プロキシされる全リクエストが
1ホップ余計に踏んでいる。転送先を直接指定すればこれは消える。

`AVVY_ORIGIN` は Vercel の本番エイリアスを指すこと。プレビュー用のURLはデプロイ
ごとに変わるので使えない。

```sh
curl -i https://avvy-deco.vercel.app/avvy-deco | head -20
```

200 と、`/avvy-deco/_next/` で始まるアセットURLが返れば正しい。

## 関連

- 配信元: [Naturalclar/medley-generator](https://github.com/Naturalclar/medley-generator)
- medley-generator 側の `index.html` には `smashcat.dev` を指す canonical が入っている。
  同じ内容が GitHub Pages 側のURLからも見えるため、正規URLを明示する必要がある。
- OAuth の「承認済みの JavaScript 生成元」は `https://smashcat.dev`。ブラウザが認証を
  行うのはプロキシ先ではなくこちら側。
