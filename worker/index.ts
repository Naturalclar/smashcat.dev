/**
 * smashcat.dev のルーティング。
 *
 * ルート直下は Vite のビルド成果物 (dist/) を配信し、/medley-generator/ 以下だけを
 * GitHub Pages にプロキシする。GitHub Pages は Host ヘッダを見て配信サイトを
 * 決めるため、単に転送するのではなく上流のURLを組み直す必要がある。
 */

type Env = {
  ASSETS: Fetcher
}

/**
 * プロキシ先のオリジン。
 *
 * naturalclar.github.io は Naturalclar/naturalclar.github.io に残っている CNAME
 * (naturalclar.dev) の影響でリダイレクトを返す可能性がある。下の fetch は
 * redirect: 'follow' なので追従するが、実際に 200 を返すオリジンを直接
 * 指定した方が一手減る。
 *
 *   curl -i https://naturalclar.github.io/medley-generator/ | head -20
 */
const MEDLEY_ORIGIN = 'https://naturalclar.github.io'

/** medley-generator の vite base と一致させること。 */
const MEDLEY_PREFIX = '/medley-generator'

/** 上流に引き継ぐと壊れる、あるいは引き継ぐ意味がないヘッダ。 */
const STRIPPED_REQUEST_HEADERS = ['host', 'cf-connecting-ip', 'cf-ray']

async function proxyToMedley(request: Request, url: URL): Promise<Response> {
  const upstream = new URL(url.pathname + url.search, MEDLEY_ORIGIN)

  // 元のリクエストヘッダをそのまま渡すと Host が smashcat.dev のままになり、
  // GitHub Pages が配信サイトを特定できずに 404 を返す。
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

  // Location が残っているとブラウザが GitHub Pages 側のURLへ出ていってしまい、
  // smashcat.dev のまま見せるという目的が崩れる。
  const outHeaders = new Headers(response.headers)
  outHeaders.delete('location')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: outHeaders,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // 末尾スラッシュなしだと、ビルド済みアセットの相対解決が一つ上の階層に
    // ずれる。先に正規化しておく。
    if (url.pathname === MEDLEY_PREFIX) {
      url.pathname = `${MEDLEY_PREFIX}/`
      return Response.redirect(url.toString(), 301)
    }

    if (url.pathname.startsWith(`${MEDLEY_PREFIX}/`)) {
      return proxyToMedley(request, url)
    }

    return env.ASSETS.fetch(request)
  },
}
