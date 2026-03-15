/**
 * Civic Pass provider.
 *
 * Checks whether a Solana wallet holds an active Civic gateway token (SBT).
 * Civic Pass is a KYC/identity verification credential issued as a
 * non-transferable token.
 */

import type { IdentityProvider, ResolvedIdentity, ResolveContext } from '../types'

export interface CivicOptions {
  /** Civic gateway network to check (default: mainnet ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6) */
  gatekeeperNetwork?: string
  /** Civic API endpoint override */
  apiUrl?: string
}

/** Civic mainnet gatekeeper network */
const CIVIC_MAINNET_NETWORK = 'ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6'

export function civic(options: CivicOptions = {}): IdentityProvider {
  const { gatekeeperNetwork = CIVIC_MAINNET_NETWORK, apiUrl } = options

  return {
    name: 'civic',
    chains: ['solana'],

    async resolve(ctx: ResolveContext): Promise<ResolvedIdentity[]> {
      const token = await findGatewayToken(ctx.address, gatekeeperNetwork, apiUrl, ctx.signal)
      if (!token) return []

      return [{
        provider: 'civic',
        did: null,
        label: 'Civic Pass',
        type: 'sbt',
        meta: {
          gatekeeperNetwork,
          state: token.state,
          expiry: token.expiry,
          tokenAddress: token.address,
        },
      }]
    },
  }
}

interface GatewayToken {
  address: string
  state: string
  expiry: string | null
}

/** Look up Civic gateway token for a wallet */
async function findGatewayToken(
  address: string,
  gatekeeperNetwork: string,
  apiUrl?: string,
  signal?: AbortSignal,
): Promise<GatewayToken | null> {
  // Use Civic's public API to check gateway token status
  const url = apiUrl
    ? `${apiUrl}/token/${address}/${gatekeeperNetwork}`
    : `https://gateway.civic.com/v1/token/${address}/${gatekeeperNetwork}`

  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const data = await res.json() as {
      token?: string
      state?: string
      expiry?: string
    }
    if (!data.token) return null
    return {
      address: data.token,
      state: data.state ?? 'active',
      expiry: data.expiry ?? null,
    }
  } catch {
    return null
  }
}
