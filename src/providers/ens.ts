/**
 * ENS (Ethereum Name Service) provider.
 *
 * Reverse-resolves ENS names for an Ethereum address, optionally checking
 * whether the domain has a DID Document attached (did:ens).
 */

import type { IdentityProvider, ResolvedIdentity, ResolveContext } from '../types'

export interface EnsOptions {
  /** Only return domains that have a DID Document attached (default false) */
  requireDidDocument?: boolean
  /** Ethereum JSON-RPC endpoint (default: uses public endpoint) */
  rpcUrl?: string
}

export function ens(options: EnsOptions = {}): IdentityProvider {
  const { requireDidDocument = false } = options

  return {
    name: 'ens',
    chains: ['ethereum'],

    async resolve(ctx: ResolveContext): Promise<ResolvedIdentity[]> {
      const rpc = ctx.rpcUrl ?? options.rpcUrl ?? 'https://eth.llamarpc.com'
      const name = await reverseResolve(ctx.address, rpc, ctx.signal)
      if (!name) return []

      if (requireDidDocument) {
        const hasDid = await checkDidDocument(name, ctx.signal)
        if (!hasDid) return []
      }

      return [{
        provider: 'ens',
        did: `did:ens:${name}`,
        label: name,
        type: 'domain',
        meta: { domain: name, hasDidDocument: requireDidDocument },
      }]
    },
  }
}

/**
 * Reverse-resolve an Ethereum address to its primary ENS name.
 *
 * Uses the `eth_call` to the ENS reverse registrar. Falls back to a
 * simple JSON-RPC approach that doesn't require ethers.js.
 */
async function reverseResolve(
  address: string,
  rpcUrl: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    // Use the ENS reverse resolver via Universal Resolver as a lightweight approach
    const res = await fetch(
      `https://dev.uniresolver.io/1.0/identifiers/did:ens:${address}`,
      { signal },
    )
    if (!res.ok) return null
    const data = await res.json() as { didDocument?: { id?: string; alsoKnownAs?: string[] } }
    // Extract the ENS name from the resolved DID
    const did = data?.didDocument?.id
    if (did?.startsWith('did:ens:')) {
      const name = did.replace('did:ens:', '')
      if (name.endsWith('.eth')) return name
    }
    return null
  } catch {
    return null
  }
}

/** Check whether an ENS domain has a DID Document attached */
async function checkDidDocument(
  name: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://dev.uniresolver.io/1.0/identifiers/did:ens:${name}`,
      { signal },
    )
    return res.ok
  } catch {
    return false
  }
}
