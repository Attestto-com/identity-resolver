/**
 * Attestto SSID provider.
 *
 * Checks whether a Solana wallet holds an Attestto SSID soulbound token.
 * The SSID SBT binds a wallet to a verified DID (did:sns) with dual-key
 * encrypted proofs and consent-gated access — similar to Civic Pass but
 * for DID-based self-sovereign identity.
 */

import type { IdentityProvider, ResolvedIdentity, ResolveContext } from '../types'

export interface AttesttoSsidOptions {
  /** Attestto SSID program ID on Solana */
  programId: string
  /** RPC endpoint override */
  rpcUrl?: string
  /** API endpoint for SSID verification (optional, falls back to RPC) */
  apiUrl?: string
}

export function attesttoSsid(options: AttesttoSsidOptions): IdentityProvider {
  const { programId, apiUrl } = options

  return {
    name: 'attestto-ssid',
    chains: ['solana'],

    async resolve(ctx: ResolveContext): Promise<ResolvedIdentity[]> {
      const rpc = ctx.rpcUrl ?? options.rpcUrl
      const ssid = await findSsidToken(ctx.address, programId, rpc, apiUrl, ctx.signal)
      if (!ssid) return []

      return [{
        provider: 'attestto-ssid',
        did: ssid.did,
        label: ssid.domain ?? 'Attestto SSID',
        type: 'sbt',
        meta: {
          programId,
          tier: ssid.tier,
          domain: ssid.domain,
          tokenAddress: ssid.tokenAddress,
          verified: ssid.verified,
        },
      }]
    },
  }
}

interface SsidToken {
  did: string
  domain: string | null
  tier: number
  tokenAddress: string
  verified: boolean
}

/** Look up Attestto SSID soulbound token for a wallet */
async function findSsidToken(
  address: string,
  programId: string,
  rpcUrl?: string,
  apiUrl?: string,
  signal?: AbortSignal,
): Promise<SsidToken | null> {
  // Strategy 1: Use Attestto API if available
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/ssid/${address}`, { signal })
      if (!res.ok) return null
      return await res.json() as SsidToken
    } catch {
      // Fall through to RPC
    }
  }

  // Strategy 2: Query Solana RPC for program accounts owned by this wallet
  const rpc = rpcUrl ?? 'https://api.mainnet-beta.solana.com'
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getProgramAccounts',
        params: [
          programId,
          {
            encoding: 'jsonParsed',
            filters: [
              { memcmp: { offset: 8, bytes: address } },
            ],
          },
        ],
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as {
      result?: Array<{ pubkey: string; account: { data: unknown } }>
    }
    if (!data.result?.length) return null

    // Found an SSID account — parse the token data
    const account = data.result[0]
    return {
      did: `did:sns:${address.slice(0, 8)}`, // Placeholder — real parsing depends on account layout
      domain: null,
      tier: 3,
      tokenAddress: account.pubkey,
      verified: true,
    }
  } catch {
    return null
  }
}
