import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = fileURLToPath(new URL('./fixtures/', import.meta.url))

// Installs the WKWebView / browser globals our adapter relies on, then loads the
// package fresh (globals must exist before @inertiajs/core's router is imported).
// Returns the message log to native and helpers to drive a scenario.
export async function setup({ url = 'http://localhost:3000/' } = {}) {
  // `window` is globalThis here, so the shim installed by a previous scenario
  // in this file persists. Clear it so each setup() starts clean — otherwise
  // initHotwireNative's idempotency guard would skip reinstalling on a fresh
  // document, leaving the new scenario with a stale, dead driver.
  delete globalThis.Turbo
  delete globalThis.HotwireNative
  delete globalThis.Strada
  delete globalThis.webBridge

  const winEvents = new EventTarget()
  globalThis.window = globalThis
  // @inertiajs/core reads navigator.userAgent at import time (scroll.ts). Node
  // only exposes a global `navigator` from v21+, so polyfill one when absent —
  // otherwise tests pass on newer Node but throw on Node 20 in CI. On v21+ the
  // global is a read-only getter, so only define it when missing.
  if (!globalThis.navigator) globalThis.navigator = { userAgent: 'node' }
  globalThis.addEventListener = (...a) => winEvents.addEventListener(...a)
  globalThis.removeEventListener = (...a) => winEvents.removeEventListener(...a)
  globalThis.dispatchEvent = (e) => winEvents.dispatchEvent(e)
  globalThis.location = new URL(url)
  globalThis.history = {
    state: null,
    length: 1,
    scrollRestoration: 'auto',
    pushState() {},
    replaceState() {},
    forward() {},
    go() {},
    back() {},
  }

  const doc = new EventTarget()
  doc.documentElement = { dataset: {} }
  doc.baseURI = url
  doc.hidden = false
  doc.title = ''
  doc.querySelector = () => null
  globalThis.document = doc
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0)

  // Messages posted to the native turbo + bridge message handlers.
  const turboMessages = []
  const bridgeMessages = []
  globalThis.webkit = {
    messageHandlers: {
      turbo: { postMessage: (m) => turboMessages.push(m) },
      bridge: { postMessage: (m) => bridgeMessages.push(m) },
    },
  }

  // Import after globals exist.
  const { router } = await import('@inertiajs/core')
  const { initHotwireNative } = await import('../src/index.js')

  function loadFixture(name) {
    const src = fs.readFileSync(`${fixturesDir}${name}`, 'utf8')
    ;(0, eval)(src)
  }

  function dispatchInertia(name, detail, { cancelable = false } = {}) {
    const event = new CustomEvent(`inertia:${name}`, { cancelable, detail })
    document.dispatchEvent(event)
    return event
  }

  return {
    turboMessages,
    bridgeMessages,
    router,
    initHotwireNative,
    loadFixture,
    dispatchInertia,
    winEvents,
    tick: (ms = 10) => new Promise((r) => setTimeout(r, ms)),
  }
}
