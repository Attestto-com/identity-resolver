/**
 * Solana Attestation Service (SAS) provider.
 *
 * Discovers on-chain attestations for a wallet address — vLEI, DID identity,
 * and custom attestation schemas.
 */

import type { IdentityProvider, ResolvedIdentity, ResolveContext } from '../types'

export interface SasOptions {
  /** SAS program ID */
  programId?: string
  /** Filter by specific schema IDs (empty = all schemas) */
  schemaIds?: string[]
  /** API endpoint override */
  apiUrl?: string
}

const SAS_PROGRAM_ID = 'SAServiceXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' // Placeholder

export function sas(options: SasOptions = {}): IdentityProvider {
  const { programId = SAS_PROGRAM_ID, schemaIds = [], apiUrl } = options

  return {
    name: 'sas',
    chains: ['solana'],

    async resolve(ctx: ResolveContext): Promise<ResolvedIdentity[]> {
      const attestations = await findAttestations(
        ctx.address, programId, schemaIds, ctx.rpcUrl, apiUrl, ctx.signal,
      )
      return attestations.map((att) => ({
        provider: 'sas',
        did: att.subjectDid,
        label: att.schemaName ?? `SAS Attestation`,
        type: 'attestation' as const,
        meta: {
          schemaId: att.schemaId,
          attester: att.attester,
          timestamp: att.timestamp,
          revoked: att.revoked,
        },
      }))
    },
  }
}

interface SasAttestation {
  schemaId: string
  schemaName: string | null
  subjectDid: string | null
  attester: string
  timestamp: string
  revoked: boolean
}

/** Find SAS attestations for a wallet */
async function findAttestations(
  address: string,
  programId: string,
  schemaIds: string[],
  rpcUrl?: string,
  apiUrl?: string,
  signal?: AbortSignal,
): Promise<SasAttestation[]> {
  if (apiUrl) {
    try {
      const params = new URLSearchParams({ address })
      if (schemaIds.length) params.set('schemas', schemaIds.join(','))
      const res = await fetch(`${apiUrl}/attestations?${params}`, { signal })
      if (!res.ok) return []
      const data = await res.json() as { attestations?: SasAttestation[] }
      return data.attestations ?? []
    } catch {
      return []
    }
  }

  // Direct RPC query — similar pattern to attestto-ssid
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
    if (!res.ok) return []
    const data = await res.json() as {
      result?: Array<{ pubkey: string; account: { data: unknown } }>
    }
    if (!data.result?.length) return []

    // Map accounts to attestations — real parsing depends on SAS account layout
    return data.result.map((acc) => ({
      schemaId: 'unknown',
      schemaName: null,
      subjectDid: null,
      attester: acc.pubkey,
      timestamp: new Date().toISOString(),
      revoked: false,
    }))
  } catch {
    return []
  }
}
