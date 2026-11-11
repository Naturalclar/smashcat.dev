import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.ts'

test('コラージュのホストだけを新リポジトリの Pages へ振り分ける', async () => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init })
    return new Response('collage asset', { headers: { 'content-type': 'text/javascript' } })
  }
  try {
    const env = { ASSETS: { fetch: async () => new Response('profile') } }
    for (const path of ['/', '/app.js?v=1', '/layout.js', '/style.css']) {
      const response = await worker.fetch(new Request(`https://collage.smashcat.dev${path}`), env)
      assert.equal(await response.text(), 'collage asset')
      assert.equal(requests.at(-1).url, `https://naturalclar.github.io/setli-collage${path}`)
    }
    const response = await worker.fetch(new Request('https://smashcat.dev/'), env)
    assert.equal(await response.text(), 'profile')
    assert.equal(requests.length, 4)
    await worker.fetch(new Request('https://smashcat.dev/medley-generator/app.js'), env)
    assert.equal(requests.at(-1).url, 'https://naturalclar.github.io/medley-generator/app.js')
  } finally {
    globalThis.fetch = originalFetch
  }
})
