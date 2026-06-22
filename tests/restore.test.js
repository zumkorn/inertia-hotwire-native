import { describe, it, expect, beforeAll } from 'vitest'

import { setup } from './harness.js'

// A back/restore visit restores the page from Inertia's history cache
// (no request) when an entry exists, and falls back to a fresh request otherwise.
describe('restore', () => {
  let h
  const visitCalls = []
  let backRestores = true

  beforeAll(async () => {
    h = await setup({ url: 'http://localhost:3000/navigation' })
    h.router.visit = (url, opts = {}) => visitCalls.push({ url: String(url), opts })
    // Simulate Inertia's quiet popstate restore landing on the previous page.
    globalThis.history.back = () => {
      if (!backRestores) return
      globalThis.location = new URL('http://localhost:3000/')
      setTimeout(() => h.winEvents.dispatchEvent(new Event('popstate')), 5)
    }
    h.initHotwireNative({ debug: false })
    h.loadFixture('turbo.js')
    await h.tick()
  })

  it('restores from cache without a request', async () => {
    visitCalls.length = 0
    backRestores = true
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
})
