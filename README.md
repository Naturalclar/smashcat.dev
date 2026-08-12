# smashcat.dev

`smashcat.dev` のルートサイト。Cloudflare Workers 上で動く。

## 構成

ルートサイトとプロキシを1つの Worker にまとめている。Pages プロジェクトと Worker を
別立てにする構成もあるが、デプロイ先が1つで済むこちらを採用した。

| パス | 挙動 |
|---|---|
| `/medley-generator/*` | GitHub Pages (`naturalclar.github.io`) へプロキシ |
| それ以外 | `public/` の静的ファイルを配信 |

プロキシなので、ブラウザに表示されるURLは `smashcat.dev` のまま変わらない。
リダイレクトではない点が重要で、これによって検索結果にも `smashcat.dev` として出る。

### なぜ単純な転送では動かないか

GitHub Pages は `Host` ヘッダを見て配信サイトを決める。リクエストをそのまま
転送すると `Host: smashcat.dev` が渡り、GitHub Pages はどのサイトを返すべきか
判断できずに 404 を返す。`src/index.js` で上流のURLを組み直し、`Host` を
落としているのはこのため。

### パス接頭辞を変えていない理由

medley-generator は `vite.config.ts` で `base: '/medley-generator/'` としてビルド
されている。プロキシ側も同じ `/medley-generator/` で受けているため、ビルド済みの
アセットパス (`/medley-generator/assets/...`) がそのまま解決する。
どちらか一方を変える場合は、もう一方も合わせること。

## デプロイ

```sh
pnpm install
pnpm deploy      # wrangler deploy
```

初回のみ、事前に以下が必要:

1. `smashcat.dev` のネームサーバを Cloudflare に向け、ゾーンを有効化する
2. `wrangler login`

## 確認しておくこと

`src/index.js` の `MEDLEY_ORIGIN` は `https://naturalclar.github.io` を指している。
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
