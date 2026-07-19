import { describe, it, expect, beforeAll } from 'vitest'

import { setup } from './harness.js'

// A back/restore visit restores the page from Inertia's history cache
// (no request) when an entry exists, and falls back to a fresh request otherwise.
describe('restore', () => {
  let h
  const visitCalls = []
  let backRestores = true
  // Where history.back() lands, and whether that entry is an Inertia one.
  let landsOn = 'http://localhost:3000/'
  let landsOnInertiaEntry = true

  beforeAll(async () => {
    h = await setup({ url: 'http://localhost:3000/navigation' })
    h.router.visit = (url, opts = {}) => visitCalls.push({ url: String(url), opts })
    // Simulate Inertia's quiet popstate restore landing on the previous page.
    globalThis.history.back = () => {
      if (!backRestores) return
      globalThis.location = new URL(landsOn)
      // Inertia stamps its own entries with `state.page`; anything else (a
      // Hotwire bootstrap document, say) has no state at all.
      globalThis.history.state = landsOnInertiaEntry ? { page: { url: landsOn } } : null
      setTimeout(() => h.winEvents.dispatchEvent(new Event('popstate')), 5)
    }
    h.initHotwireNative({ debug: false })
    h.loadFixture('turbo.js')
    await h.tick()
  })

  it('restores from cache without a request', async () => {
    visitCalls.length = 0
    backRestores = true
    landsOn = 'http://localhost:3000/'
    landsOnInertiaEntry = true
    window.Turbo.navigator.startVisit('http://localhost:3000/', 'rest-1', { action: 'restore' })
    await h.tick(60)

    expect(visitCalls.length).toBe(0) // no server request
    const names = h.turboMessages.map((m) => m.name)
    expect(names).toContain('visitRequestStarted')
    expect(names).toContain('visitRequestCompleted')
    expect(names).toContain('visitRendered')
    expect(names).toContain('visitCompleted')
    expect(names).toContain('visitRequestFinished')
  })

  it('falls back to a request when there is no cached entry', async () => {
    visitCalls.length = 0
    backRestores = false
    window.Turbo.navigator.startVisit('http://localhost:3000/', 'rest-2', { action: 'restore' })
    await h.tick(350)

    expect(visitCalls[0].url).toBe('http://localhost:3000/')
    expect(visitCalls[0].opts.replace).toBe(true)
  })

  // Restoring the first web page in a native stack steps onto Hotwire's
  // bootstrap document: popstate fires, but no Inertia page is restored. The
  // 250ms fallback never runs, so without this check the visit is reported as
  // completed over a blank web view.
  it('requests the page when history.back() lands off-target', async () => {
    visitCalls.length = 0
    backRestores = true
    landsOn = 'http://localhost:3000/bootstrap'
    landsOnInertiaEntry = false
    const before = h.turboMessages.length
    window.Turbo.navigator.startVisit('http://localhost:3000/', 'rest-3', { action: 'restore' })
    await h.tick(60)

    expect(visitCalls.length).toBe(1)
    expect(visitCalls[0].url).toBe('http://localhost:3000/')
    // Nothing may be reported as rendered — the web view is showing the
    // bootstrap document, not the page.
    const names = h.turboMessages.slice(before).map((m) => m.name)
    expect(names).not.toContain('visitRendered')
    expect(names).not.toContain('visitCompleted')
  })

  // Landing on a real Inertia entry at a different URL is still a miss.
  it('requests the page when back() lands on another Inertia entry', async () => {
    visitCalls.length = 0
    backRestores = true
    landsOn = 'http://localhost:3000/elsewhere'
    landsOnInertiaEntry = true
    window.Turbo.navigator.startVisit('http://localhost:3000/', 'rest-4', { action: 'restore' })
    await h.tick(60)

    expect(visitCalls.length).toBe(1)
    expect(visitCalls[0].url).toBe('http://localhost:3000/')
  })
})
