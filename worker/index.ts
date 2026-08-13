/**
 * smashcat.dev のルーティング。
 *
 * ルート直下は Vite のビルド成果物 (dist/) を配信し、特定のパス接頭辞だけを
 * 外部のデプロイ先にプロキシする。上流はホスト名で配信サイトを決めるため、
 * 単に転送するのではなく上流のURLを組み直す必要がある。
 *
 * 接頭辞ごとに上流の作法が違うので、振る舞いは PROXY_TARGETS に持たせている。
 * GitHub Pages 上の Vite アプリと Vercel 上の Next アプリでは、末尾スラッシュも
 * Location の扱いも逆になる。
 */

type Env = {
  ASSETS: Fetcher
}

type ProxyTarget = {
  /** 配信側の vite base / basePath と一致させること。ズレると 404 になる。 */
  prefix: string

  origin: string

  /**
   * `/prefix` を `/prefix/` に寄せるか。
   *
   * Vite のビルド成果物はアセットを相対で解決するため、末尾スラッシュが無いと
   * 一つ上の階層を見に行ってしまう。Next は basePath 込みの絶対URLを吐くので
   * 不要で、むしろ `/prefix/` → `/prefix` の 308 を自分で返す。有効にすると
   * 双方が逆向きのリダイレクトを出してループする。
   */
  normalizeTrailingSlash: boolean

  /**
   * 上流が返した Location を落とすか。
   *
   * 落とすのは、ブラウザが上流のURLへ出ていって smashcat.dev のまま見せる目的が
   * 崩れるのを防ぐため。ただし上流自身の正当なリダイレクト (Next の basePath
   * 正規化など) まで消すと、行き先の無い 308 になってページが出なくなる。
   * 上流ホストへ逃げるリダイレクトを返しうる配信元でだけ有効にする。
   */
  dropLocation: boolean
}

/**
 * medley-generator は GitHub Pages。
 *
 * naturalclar.github.io は Naturalclar/naturalclar.github.io に残っている CNAME
 * (naturalclar.dev) の影響でリダイレクトを返す可能性がある。下の fetch は
 * redirect: 'follow' なので追従するが、実際に 200 を返すオリジンを直接
 * 指定した方が一手減る。
 *
 *   curl -i https://naturalclar.github.io/medley-generator/ | head -20
 */
const MEDLEY_ORIGIN = 'https://naturalclar.github.io'

/**
 * avvy-deco は Vercel。
 *
 * Vercel 側の本番エイリアスを指すこと。プレビュー用のURLはデプロイごとに
 * 変わるので使えない。
 *
 *   curl -i https://avvy-deco.vercel.app/avvy-deco | head -20
 *
 * 200 と、`/avvy-deco/_next/` で始まるアセットURLが返れば正しい。
 */
const AVVY_ORIGIN = 'https://avvy-deco.vercel.app'

const PROXY_TARGETS: ProxyTarget[] = [
  {
    prefix: '/medley-generator',
    origin: MEDLEY_ORIGIN,
    normalizeTrailingSlash: true,
    dropLocation: true,
  },
  {
    prefix: '/avvy-deco',
    origin: AVVY_ORIGIN,
    normalizeTrailingSlash: false,
    dropLocation: false,
  },
]

/** 上流に引き継ぐと壊れる、あるいは引き継ぐ意味がないヘッダ。 */
const STRIPPED_REQUEST_HEADERS = ['host', 'cf-connecting-ip', 'cf-ray']

function matchTarget(pathname: string): ProxyTarget | undefined {
  return PROXY_TARGETS.find(
    (target) => pathname === target.prefix || pathname.startsWith(`${target.prefix}/`),
  )
}

async function proxy(request: Request, url: URL, target: ProxyTarget): Promise<Response> {
  const upstream = new URL(url.pathname + url.search, target.origin)

  // 元のリクエストヘッダをそのまま渡すと Host が smashcat.dev のままになり、
  // 上流が配信サイトを特定できずに 404 を返す。
  const headers = new Headers(request.headers)
  for (const name of STRIPPED_REQUEST_HEADERS) {
    headers.delete(name)
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'follow',
  })

  const outHeaders = new Headers(response.headers)
  if (target.dropLocation) {
    outHeaders.delete('location')
  } else {
    // 残す場合でも、上流オリジンを指す絶対URLはこちらのホストに書き換える。
    // 相対 Location (Next の 308 はこれ) はそのままで問題ない。
    const location = outHeaders.get('location')
    if (location?.startsWith(target.origin)) {
      outHeaders.set('location', location.slice(target.origin.length) || '/')
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: outHeaders,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const target = matchTarget(url.pathname)

    if (!target) {
      return env.ASSETS.fetch(request)
    }

    if (target.normalizeTrailingSlash && url.pathname === target.prefix) {
      url.pathname = `${target.prefix}/`
      return Response.redirect(url.toString(), 301)
    }

    return proxy(request, url, target)
  },
}
