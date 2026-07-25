import { describe, it, expect } from 'vitest'

/**
 * Phase E — Extension message-guard unit tests.
 *
 * The guard runs in the extension service worker (globalThis === self). Here
 * we load it inside a synthetic global that mimics the SW surface — chrome.runtime.id
 * plus crypto — and exercise the validators.
 */

type Guard = {
  validate: (msg: unknown, sender: unknown, opts?: { allowedMethods?: Set<string>; allowTabSender?: boolean }) => { ok: boolean; reason?: string }
  validateTopLevel: (msg: unknown, sender: unknown) => { ok: boolean; reason?: string }
  envelope: (source: string, func: string, args?: unknown) => Record<string, unknown>
  randomNonce: () => string
}

function loadGuard(): Guard {
  const scope: Record<string, unknown> = {
    chrome: { runtime: { id: 'ext-abc' } },
    crypto: globalThis.crypto,
  }
  // Emulate the `self` alias the extension uses.
  ;(scope as { self: unknown }).self = scope

  // Read the source and eval into `scope`. This mirrors how the SW loads it
  // via importScripts without pulling Chrome APIs into the test runtime.
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  const src = fs.readFileSync(path.resolve(process.cwd(), 'extension/js/message-guard.js'), 'utf8')

  const fn = new Function('self', 'chrome', 'crypto', src + '\nreturn self.LeadLensMessageGuard;')
  return fn(scope, scope.chrome, scope.crypto) as Guard
}

const goodSender = { id: 'ext-abc' }
const badSender = { id: 'attacker' }
const tabSender = { id: 'ext-abc', tab: { id: 42 } }

describe('LeadLensMessageGuard.validate', () => {
  const guard = loadGuard()
  const methods = new Set(['ping', 'startLeadLensScan'])

  it('accepts a well-formed envelope from the extension itself', () => {
    const msg = guard.envelope('content.js', 'ping', ['hi'])
    const r = guard.validate(msg, goodSender, { allowedMethods: methods, allowTabSender: true })
    expect(r.ok).toBe(true)
  })

  it('rejects a sender with a different extension id', () => {
    const msg = guard.envelope('content.js', 'ping')
    const r = guard.validate(msg, badSender, { allowedMethods: methods, allowTabSender: true })
    expect(r).toEqual({ ok: false, reason: 'unauthorized-sender' })
  })

  it('rejects tab-hosted senders when allowTabSender is false', () => {
    const msg = guard.envelope('popup.js', 'ping')
    const r = guard.validate(msg, tabSender, { allowedMethods: methods, allowTabSender: false })
    expect(r.ok).toBe(false)
  })

  it('rejects a source that is not on the allowlist', () => {
    const msg = { ...guard.envelope('content.js', 'ping'), source: 'evil.js' }
    const r = guard.validate(msg, goodSender, { allowedMethods: methods, allowTabSender: true })
    expect(r).toEqual({ ok: false, reason: 'bad-source' })
  })

  it('rejects a func that is not on the caller allowlist', () => {
    const msg = guard.envelope('content.js', 'stealCookies')
    const r = guard.validate(msg, goodSender, { allowedMethods: methods, allowTabSender: true })
    expect(r).toEqual({ ok: false, reason: 'method-not-allowed' })
  })

  it('rejects replayed nonces', () => {
    const msg = guard.envelope('content.js', 'ping')
    const first = guard.validate(msg, goodSender, { allowedMethods: methods, allowTabSender: true })
    const second = guard.validate(msg, goodSender, { allowedMethods: methods, allowTabSender: true })
    expect(first.ok).toBe(true)
    expect(second).toEqual({ ok: false, reason: 'replayed-nonce' })
  })

  it('rejects stale timestamps', () => {
    const msg = { ...guard.envelope('content.js', 'ping'), ts: Date.now() - 10 * 60 * 1000 }
    const r = guard.validate(msg, goodSender, { allowedMethods: methods, allowTabSender: true })
    expect(r).toEqual({ ok: false, reason: 'stale-ts' })
  })

  it('rejects malformed nonces', () => {
    const msg = { ...guard.envelope('content.js', 'ping'), nonce: 'short' }
    const r = guard.validate(msg, goodSender, { allowedMethods: methods, allowTabSender: true })
    expect(r).toEqual({ ok: false, reason: 'bad-nonce' })
  })

  it('rejects oversized args arrays', () => {
    const args = new Array(64).fill('x')
    const msg = { ...guard.envelope('content.js', 'ping'), args }
    const r = guard.validate(msg, goodSender, { allowedMethods: methods, allowTabSender: true })
    expect(r).toEqual({ ok: false, reason: 'too-many-args' })
  })
})

describe('LeadLensMessageGuard.validateTopLevel', () => {
  const guard = loadGuard()

  it('accepts an allowlisted type from the extension', () => {
    const msg = { type: 'qrinuxValidateKey', nonce: guard.randomNonce(), ts: Date.now(), payload: {} }
    expect(guard.validateTopLevel(msg, goodSender).ok).toBe(true)
  })

  it('rejects unknown types', () => {
    const msg = { type: 'evilCommand', nonce: guard.randomNonce(), ts: Date.now() }
    expect(guard.validateTopLevel(msg, goodSender)).toEqual({ ok: false, reason: 'type-not-allowed' })
  })

  it('rejects a foreign sender', () => {
    const msg = { type: 'qrinuxValidateKey' }
    expect(guard.validateTopLevel(msg, badSender)).toEqual({ ok: false, reason: 'unauthorized-sender' })
  })
})
