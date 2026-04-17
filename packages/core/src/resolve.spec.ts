/**
 * Tests for @attestto/identity-resolver core engine
 *
 * Covers: resolveIdentities orchestration, provider ordering,
 * timeout handling, error resilience, chain filtering, cancellation,
 * and the built-in caip10 provider.
 */

import { describe, it, expect, vi } from 'vitest'
import { resolveIdentities } from './resolve.js'
import { caip10 } from './providers/caip10.js'
import type { IdentityProvider, ResolvedIdentity, ResolveContext } from './types.js'

// ── Helper: mock provider factory ──────────────────────────────────

function mockProvider(
  name: string,
  chains: string[],
  results: ResolvedIdentity[],
  delay = 0,
): IdentityProvider {
  return {
    name,
    chains,
    resolve: async () => {
      if (delay > 0) await new Promise((r) => setTimeout(r, delay))
      return results
    },
  }
}

function mockIdentity(provider: string, label: string): ResolvedIdentity {
  return {
    provider,
    did: `did:test:${label}`,
    label,
    type: 'domain',
    meta: {},
  }
}

function throwingProvider(name: string, chains: string[]): IdentityProvider {
  return {
    name,
    chains,
    resolve: async () => {
      throw new Error(`${name} exploded`)
    },
  }
}

// ── resolveIdentities ──────────────────────────────────────────────

describe('resolveIdentities', () => {
  it('returns empty array when no providers given', async () => {
    const result = await resolveIdentities({
      chain: 'solana',
      address: 'ABC123',
      providers: [],
    })
    expect(result).toEqual([])
  })

  it('collects results from multiple providers in order', async () => {
    const p1 = mockProvider('first', ['solana'], [mockIdentity('first', 'alpha')])
    const p2 = mockProvider('second', ['solana'], [mockIdentity('second', 'beta')])

    const result = await resolveIdentities({
      chain: 'solana',
      address: 'ABC123',
      providers: [p1, p2],
    })

    expect(result).toHaveLength(2)
    expect(result[0].label).toBe('alpha')
    expect(result[1].label).toBe('beta')
  })

  it('skips providers that do not support the target chain', async () => {
    const ethOnly = mockProvider('eth-only', ['ethereum'], [mockIdentity('eth', 'nope')])
    const solana = mockProvider('sol', ['solana'], [mockIdentity('sol', 'yes')])

    const result = await resolveIdentities({
      chain: 'solana',
      address: 'ABC123',
      providers: [ethOnly, solana],
    })

    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('yes')
  })

  it('wildcard chain (*) matches any chain', async () => {
    const wildcard = mockProvider('any', ['*'], [mockIdentity('any', 'found')])

    const result = await resolveIdentities({
      chain: 'solana',
      address: 'ABC123',
      providers: [wildcard],
    })

    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('found')
  })

  it('stops on first result when stopOnFirst=true', async () => {
    const p1 = mockProvider('first', ['solana'], [mockIdentity('first', 'hit')])
    const p2 = mockProvider('second', ['solana'], [mockIdentity('second', 'skipped')])

    const result = await resolveIdentities({
      chain: 'solana',
      address: 'ABC123',
      providers: [p1, p2],
      stopOnFirst: true,
    })

    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('hit')
  })

  it('does NOT stop on empty first result with stopOnFirst', async () => {
    const empty = mockProvider('empty', ['solana'], [])
    const p2 = mockProvider('second', ['solana'], [mockIdentity('second', 'found')])

    const result = await resolveIdentities({
      chain: 'solana',
      address: 'ABC123',
      providers: [empty, p2],
      stopOnFirst: true,
    })

    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('found')
  })

  it('silently skips providers that throw errors', async () => {
    const bad = throwingProvider('broken', ['solana'])
    const good = mockProvider('good', ['solana'], [mockIdentity('good', 'ok')])

    const result = await resolveIdentities({
      chain: 'solana',
      address: 'ABC123',
      providers: [bad, good],
    })

    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('ok')
  })

  it('times out slow providers', async () => {
    const slow = mockProvider('slow', ['solana'], [mockIdentity('slow', 'late')], 500)
    const fast = mockProvider('fast', ['solana'], [mockIdentity('fast', 'quick')])

    const result = await resolveIdentities({
      chain: 'solana',
      address: 'ABC123',
      providers: [slow, fast],
      timeoutMs: 50,
    })

    // slow should have been skipped due to timeout
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('quick')
  })

  it('respects AbortSignal cancellation', async () => {
    const controller = new AbortController()
    const p1: IdentityProvider = {
      name: 'aborter',
      chains: ['solana'],
      resolve: async () => {
        controller.abort()
        return [mockIdentity('aborter', 'first')]
      },
    }
    const p2 = mockProvider('second', ['solana'], [mockIdentity('second', 'skipped')])

    const result = await resolveIdentities({
      chain: 'solana',
      address: 'ABC123',
      providers: [p1, p2],
      signal: controller.signal,
    })

    // p1 runs, then signal is aborted, so p2 is skipped
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('first')
  })

  it('passes rpcUrl through context to providers', async () => {
    let receivedCtx: ResolveContext | null = null
    const spy: IdentityProvider = {
      name: 'spy',
      chains: ['solana'],
      resolve: async (ctx) => {
        receivedCtx = ctx
        return []
      },
    }

    await resolveIdentities({
      chain: 'solana',
      address: 'ABC123',
      providers: [spy],
      rpcUrl: 'https://my-rpc.example.com',
    })

    expect(receivedCtx).not.toBeNull()
    expect(receivedCtx!.rpcUrl).toBe('https://my-rpc.example.com')
    expect(receivedCtx!.chain).toBe('solana')
    expect(receivedCtx!.address).toBe('ABC123')
  })
})

// ── caip10 provider ────────────────────────────────────────────────

describe('caip10 provider', () => {
  it('returns a CAIP-10 identifier for Solana', async () => {
    const provider = caip10()
    const result = await provider.resolve({
      chain: 'solana',
      address: 'ABC123def456',
    })

    expect(result).toHaveLength(1)
    expect(result[0].provider).toBe('caip10')
    expect(result[0].did).toBeNull()
    expect(result[0].type).toBe('address')
    expect(result[0].meta.caip10).toContain('caip10:solana:')
    expect(result[0].meta.caip10).toContain('ABC123def456')
  })

  it('returns a CAIP-10 identifier for Ethereum', async () => {
    const provider = caip10()
    const result = await provider.resolve({
      chain: 'ethereum',
      address: '0xABC',
    })

    expect(result[0].meta.caip10).toContain('eip155:1')
  })

  it('uses custom chainId when provided', async () => {
    const provider = caip10({ chainId: 'custom:999' })
    const result = await provider.resolve({
      chain: 'solana',
      address: 'XYZ',
    })

    expect(result[0].meta.caip10).toBe('caip10:custom:999:XYZ')
  })

  it('supports wildcard chain (*)', () => {
    const provider = caip10()
    expect(provider.chains).toContain('*')
  })

  it('truncates address for label', async () => {
    const provider = caip10()
    const result = await provider.resolve({
      chain: 'solana',
      address: 'ABCDEFghijklmnopqrstuvwxyz',
    })

    expect(result[0].label).toBe('ABCDEF...wxyz')
  })
})
