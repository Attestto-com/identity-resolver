/**
 * Core resolution engine.
 *
 * Runs providers in the order specified by the consumer, collects results,
 * and respects timeouts and cancellation.
 */

import type { ResolveOptions, ResolvedIdentity, ResolveContext } from './types'

/**
 * Resolve all on-chain identities for a wallet address.
 *
 * Providers run in the order you specify — that order defines priority.
 * Each provider that doesn't support the target chain is silently skipped.
 *
 * @example
 * ```ts
 * import { resolveIdentities } from 'wallet-identity-resolver'
 * import { sns, civic, pkh } from 'wallet-identity-resolver/providers'
 *
 * const identities = await resolveIdentities({
 *   chain: 'solana',
 *   address: pubkey,
 *   providers: [sns({ requireDidDocument: true }), civic(), pkh()],
 * })
 * ```
 */
export async function resolveIdentities(options: ResolveOptions): Promise<ResolvedIdentity[]> {
  const {
    chain,
    address,
    providers,
    rpcUrl,
    timeoutMs = 5000,
    stopOnFirst = false,
    signal,
  } = options

  const results: ResolvedIdentity[] = []

  const ctx: ResolveContext = { chain, address, rpcUrl, signal }

  for (const provider of providers) {
    // Skip providers that don't support this chain
    if (!provider.chains.includes(chain) && !provider.chains.includes('*')) {
      continue
    }

    // Check cancellation
    if (signal?.aborted) break

    try {
      const providerResults = await withTimeout(
        provider.resolve(ctx),
        timeoutMs,
        provider.name,
      )
      results.push(...providerResults)

      if (stopOnFirst && providerResults.length > 0) break
    } catch {
      // Provider failed or timed out — skip silently, don't block others
      continue
    }
  }

  return results
}

/** Race a promise against a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Provider "${label}" timed out after ${ms}ms`)),
      ms,
    )
    promise
      .then((val) => { clearTimeout(timer); resolve(val) })
      .catch((err) => { clearTimeout(timer); reject(err) })
  })
}
