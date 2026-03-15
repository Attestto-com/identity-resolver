/**
 * did:pkh provider — always-available fallback.
 *
 * Derives a did:pkh from the raw wallet address. No RPC calls needed.
 */

import type { IdentityProvider, ResolvedIdentity, ResolveContext } from '../types'

const CHAIN_PREFIXES: Record<string, string> = {
  solana: 'solana',
  ethereum: 'eip155:1',
}

export interface PkhOptions {
  /** Override the CAIP-2 chain prefix (default: auto-detect from chain) */
  chainPrefix?: string
}

export function pkh(options: PkhOptions = {}): IdentityProvider {
  return {
    name: 'pkh',
    chains: ['*'],

    async resolve(ctx: ResolveContext): Promise<ResolvedIdentity[]> {
      const prefix = options.chainPrefix ?? CHAIN_PREFIXES[ctx.chain] ?? ctx.chain
      const did = `did:pkh:${prefix}:${ctx.address}`

      return [{
        provider: 'pkh',
        did,
        label: `${ctx.address.slice(0, 6)}...${ctx.address.slice(-4)}`,
        type: 'did',
        meta: { chain: ctx.chain, derived: true },
      }]
    },
  }
}
