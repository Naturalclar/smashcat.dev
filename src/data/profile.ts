/**
 * サイトの内容はすべてここにある。表示側 (components/) は触らずに、
 * このファイルを編集すれば更新できる。
 */

export type Link = {
  platform: string
  handle: string
  url: string
}

export type FanArt = {
  /** public/images/fanart/ からの相対パス */
  src: string
  /** 作者名。画像が出ない環境でも誰の作品か分かるよう alt にも使う */
  artist: string
  /** 作者のプロフィールURL */
  artistUrl: string
  /** 任意。作品の一言説明 */
  caption?: string
}

export type Tool = {
  name: string
  description: string
  href: string
}

/** TODO: 配信名義に差し替える */
export const name = 'smashcat'

/** TODO: 一言紹介に差し替える */
export const tagline = '配信で音楽をやっています。'

/** TODO: プロフィール本文に差し替える。段落ごとに配列の要素にする */
export const about: string[] = [
  'プロフィール本文をここに書きます。どんな配信をしているか、いつやっているか、何を演奏するかなど。',
]

/** public/images/avatar.jpg に画像を置く。正方形・256px 以上を推奨 */
export const avatar = '/images/avatar.jpg'

export const links: Link[] = [
  { platform: 'X', handle: '@smashcat_clar', url: 'https://x.com/smashcat_clar' },
  {
    platform: 'Avvy',
    handle: 'smashcat',
    url: 'https://s.avvy.live/u/01jqvd06tqevaqdkrkwt810vjp?lang=ja',
  },
]

/**
 * いただいたファンアート。1件につき1エントリ足す。
 *
 * 画像は public/images/fanart/ に置く。表示は正方形にトリミングされるため
 * (object-fit: cover)、元画像の縦横比は問わない。
 *
 * 掲載は作者の許諾を得たものに限ること。作者名とリンクは必須にしてある。
 */
export const fanArt: FanArt[] = []

export const tools: Tool[] = [
  {
    name: 'メドレーセトリ生成',
    description:
      '配信で演奏するメドレーの曲目を自動で組み、YouTube で連続再生できるツール。',
    href: '/medley-generator/',
  },
]
