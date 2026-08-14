/**
 * OGP 画像 (public/images/ogp.png) を作る。
 *
 *   pnpm run ogp
 *
 * ogp/template.html を 1200x630 で開いてスクリーンショットを撮るだけ。
 * 文言は src/data/profile.ts から読むので、テンプレート側に名義を持たせない。
 *
 * 一枚絵は ogp/art.{png,jpg,jpeg,webp} を置くと右側に入る。無い場合は
 * プレースホルダのまま出力するので、レイアウトの確認には使える。
 */

import { existsSync, readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

/** OGP の推奨サイズ。template.html の body と一致させること。 */
const WIDTH = 1200
const HEIGHT = 630

const ART_CANDIDATES = ['art.png', 'art.jpg', 'art.jpeg', 'art.webp']

/**
 * profile.ts から文字列の定数を取り出す。
 *
 * 正規表現で読んでいるのは、TypeScript を実行せずに済ませるため。
 * `export const name = '...'` の形が崩れたら読めなくなるので、その場合は
 * 黙って空にせず落とす。
 */
function readProfile(key) {
  const source = readFileSync(join(ROOT, 'src/data/profile.ts'), 'utf8')
  const matched = source.match(new RegExp(`export const ${key} = '([^']*)'`))
  if (!matched) {
    throw new Error(
      `src/data/profile.ts から ${key} を読めなかった。定義の書き方が変わっていないか確認する`,
    )
  }
  return matched[1]
}

const name = readProfile('name')
const tagline = readProfile('tagline')

const art = ART_CANDIDATES.map((file) => join(HERE, file)).find((path) => existsSync(path))
if (!art) {
  console.warn(
    `一枚絵が見つからないのでプレースホルダで出力する (${ART_CANDIDATES.join(' / ')} のいずれかを ogp/ に置く)`,
  )
}

/*
 * 通常は playwright が入れた Chromium が使われる (初回のみ
 * `pnpm exec playwright install chromium` が必要)。既にどこかにある
 * Chromium を使わせたい場合は OGP_CHROMIUM_PATH でその実行ファイルを指す。
 */
const browser = await chromium.launch({
  executablePath: process.env.OGP_CHROMIUM_PATH || undefined,
})
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  })

  await page.goto(pathToFileURL(join(HERE, 'template.html')).href)

  await page.evaluate(
    ({ name, tagline, artUrl }) => {
      document.getElementById('name').textContent = name
      document.getElementById('tagline').textContent = tagline

      if (artUrl) {
        const el = document.getElementById('art')
        el.classList.remove('art--empty')
        el.textContent = ''
        el.style.backgroundImage = `url("${artUrl}")`
      }
    },
    { name, tagline, artUrl: art ? pathToFileURL(art).href : null },
  )

  // 背景画像とフォントの読み込みが終わってから撮る。待たないと
  // 画像が空のまま、あるいはフォールバックのフォントで写ることがある。
  await page.evaluate(() => document.fonts.ready)
  if (art) {
    await page.evaluate(
      (url) =>
        new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = resolve
          img.onerror = () => reject(new Error(`一枚絵を読み込めなかった: ${url}`))
          img.src = url
        }),
      pathToFileURL(art).href,
    )
  }

  const out = join(ROOT, 'public/images/ogp.png')
  await mkdir(dirname(out), { recursive: true })
  await page.screenshot({ path: out })

  console.log(`${out} を書き出した (${WIDTH}x${HEIGHT})`)
} finally {
  await browser.close()
}
