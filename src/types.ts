/**
 * wallet-identity-resolver — Core type definitions
 *
 * Defines the pluggable provider interface and resolved identity model.
 */

// ---------------------------------------------------------------------------
// Chains
// ---------------------------------------------------------------------------

export type Chain = 'solana' | 'ethereum' | (string & Record<never, never>)

// ---------------------------------------------------------------------------
// Resolved identity
// ---------------------------------------------------------------------------

/** A single identity discovered on-chain for a wallet address */
export interface ResolvedIdentity {
  /** Provider that resolved this identity (e.g. 'sns', 'civic', 'ens') */
  provider: string
  /** The resolved DID, if applicable */
  did: string | null
  /** Human-readable label (domain name, credential title, etc.) */
  label: string
  /** Identity type category */
  type: IdentityType
  /** Provider-specific metadata */
  meta: Record<string, unknown>
}

export type IdentityType =
  | 'domain'       // SNS, ENS, AllDomains
  | 'sbt'          // Soulbound tokens, gateway tokens
  | 'attestation'  // SAS, EAS attestations
  | 'credential'   // Verifiable credentials found on-chain
  | 'did'          // Native DID method (did:sol, did:pkh)
  | 'score'        // Reputation/identity scores (Gitcoin Passport)

// ---------------------------------------------------------------------------
// Provider interface (plugins implement this)
// ---------------------------------------------------------------------------

/** Configuration passed to every provider during resolution */
export interface ResolveContext {
  /** Which chain we're resolving on */
  chain: Chain
  /** The wallet address / public key */
  address: string
  /** Optional RPC endpoint override */
  rpcUrl?: string
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

/**
 * An identity provider plugin.
 *
 * Each provider knows how to discover one type of on-chain identity.
 * Providers are stateless — all config is passed via the factory function.
 */
export interface IdentityProvider {
  /** Unique provider name (e.g. 'sns', 'civic', 'attestto-ssid') */
  name: string
  /** Which chains this provider supports */
  chains: Chain[]
  /**
   * Resolve identities for the given address.
   * Return an empty array if nothing found — never throw.
   */
  resolve(ctx: ResolveContext): Promise<ResolvedIdentity[]>
}

// ---------------------------------------------------------------------------
// Resolution options (passed by the consumer)
// ---------------------------------------------------------------------------

export interface ResolveOptions {
  /** Which chain to resolve on */
  chain: Chain
  /** Wallet address / public key */
  address: string
  /** Ordered list of providers to run (defines priority) */
  providers: IdentityProvider[]
  /** Optional RPC endpoint override */
  rpcUrl?: string
  /** Timeout per provider in ms (default 5000) */
  timeoutMs?: number
  /** Stop after first provider returns results (default false) */
  stopOnFirst?: boolean
  /** Abort signal for cancellation */
  signal?: AbortSignal
}
