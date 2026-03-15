/**
 * SNS (Solana Name Service) provider.
 *
 * Reverse-resolves SNS domains for a Solana public key, then optionally
 * checks whether each domain has a DID Document attached (did:sns).
 *
 * The consumer provides the RPC URL and can require DID Document existence.
 */

import type { IdentityProvider, ResolvedIdentity, ResolveContext } from '../types'

export interface SnsOptions {
  /** Only return domains that have a DID Document attached (default true) */
  requireDidDocument?: boolean
  /** SNS reverse lookup API endpoint (override for custom infra) */
  apiUrl?: string
}

export function sns(options: SnsOptions = {}): IdentityProvider {
  const { requireDidDocument = true, apiUrl } = options

  return {
    name: 'sns',
    chains: ['solana'],

    async resolve(ctx: ResolveContext): Promise<ResolvedIdentity[]> {
      const domains = await reverseLookup(ctx.address, ctx.rpcUrl, apiUrl, ctx.signal)
      if (domains.length === 0) return []

      const results: ResolvedIdentity[] = []

      for (const domain of domains) {
        if (requireDidDocument) {
          const hasDid = await checkDidDocument(domain, ctx.rpcUrl, ctx.signal)
          if (!hasDid) continue
        }

        results.push({
          provider: 'sns',
          did: `did:sns:${domain}`,
          label: domain,
          type: 'domain',
          meta: { domain, hasDidDocument: requireDidDocument },
        })
      }

      return results
    },
  }
}

/**
 * Reverse-lookup SNS domains for a Solana public key.
 *
 * Uses the SNS SDK reverse lookup via RPC, or falls back to an API.
 * Implementers can override `apiUrl` to point at their own service.
 */
async function reverseLookup(
  address: string,
  rpcUrl?: string,
  apiUrl?: string,
  signal?: AbortSignal,
): Promise<string[]> {
  // Strategy: use a public API for reverse lookup
  // Consumers can override with their own endpoint
  const url = apiUrl
    ? `${apiUrl}/reverse/${address}`
    : `https://sns-sdk-proxy.bonfida.workers.dev/v2/domain/reverse-lookup/${address}`

  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = await res.json() as { result?: string[]; success?: boolean }
    // Bonfida proxy returns { result: ['domain.sol'], success: true }
    if (Array.isArray(data.result)) return data.result
    return []
  } catch {
    return []
  }
}

/**
 * Check whether an SNS domain has a DID Document attached.
 *
 * This verifies the domain is a did:sns-enabled domain, not just a plain
 * SNS name. Currently only Attestto-registered domains have DID Documents.
 */
async function checkDidDocument(
  domain: string,
  _rpcUrl?: string,
  signal?: AbortSignal,
): Promise<boolean> {
  // Attempt to resolve the DID Document via a Universal Resolver or custom endpoint
  // For now, check if the domain resolves at the did:sns resolver
  try {
    const cleanDomain = domain.replace(/\.sol$/, '')
    const res = await fetch(
      `https://dev.uniresolver.io/1.0/identifiers/did:sns:${cleanDomain}`,
      { signal },
    )
    return res.ok
  } catch {
    return false
  }
}
