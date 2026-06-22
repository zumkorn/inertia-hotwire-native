import { describe, it, expect } from 'vitest'

import { uuid } from '../src/util.js'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('uuid', () => {
  it('returns a valid v4 UUID via crypto.randomUUID', () => {
    expect(uuid()).toMatch(V4)
  })

  it('returns a valid v4 UUID via the fallback (no crypto.randomUUID)', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    // Force the fallback branch (old webview / non-secure context).
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
    try {
      expect(uuid()).toMatch(V4)
      // The fallback must be able to emit 'f' — the old generator (Math.random()
      // * 15) never could, which this guards against regressing.
      const many = Array.from({ length: 200 }, () => uuid()).join('')
      expect(many).toContain('f')
    } finally {
      Object.defineProperty(globalThis, 'crypto', original)
    }
  })
})
