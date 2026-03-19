# identity-resolver

Pluggable on-chain identity discovery for wallet addresses. Given a wallet address and chain, discover all DIDs, SBTs, attestations, and credentials attached to it.

The consumer decides which identity types to accept and in what priority — no hardcoded assumptions, no hardcoded endpoints.

```
npm install identity-resolver
```

## Quick Start

```ts
import { resolveIdentities, sns, pkh } from 'identity-resolver'

const identities = await resolveIdentities({
  chain: 'solana',
  address: 'ATTEstto1234567890abcdef...',
  providers: [
    sns({ apiUrl: '/api/sns', resolverUrl: '/api/resolver' }),
    pkh(),  // Fallback — always resolves, no network calls
  ],
})

// Returns: ResolvedIdentity[]
// [
//   { provider: 'sns', did: 'did:sns:alice.sol', label: 'alice.sol', type: 'domain', meta: { ... } },
//   { provider: 'pkh', did: 'did:pkh:solana:5eykt4...:ATTEstto...', label: 'ATTEstto...', type: 'did', meta: {} }
// ]
```

## Built-in Providers

| Provider | Type | Network calls |
|---|---|---|
| `pkh()` | `did:pkh` fallback | None — deterministic DID from address |
| `sns(opts)` | SNS `.sol` domains | `apiUrl` for domain lookup, `resolverUrl` for DID Document |

## External Providers

Install additional providers for more identity types:

```bash
npm install @attestto/wir-sns          # SNS domains → did:sns
npm install @attestto/wir-attestto-creds  # KYC, SBTs, VCs
npm install @attestto/wir-civic        # Civic Pass gateway tokens
npm install @attestto/wir-ens          # ENS domains → did:ens
```

## API

### `resolveIdentities(options): Promise<ResolvedIdentity[]>`

```ts
interface ResolveOptions {
  chain: Chain                    // 'solana', 'ethereum', or custom
  address: string                 // Wallet address / public key
  providers: IdentityProvider[]   // Ordered list — defines priority
  rpcUrl?: string                 // Global RPC override
  timeoutMs?: number              // Per-provider timeout (default 5000ms)
  stopOnFirst?: boolean           // Stop after first provider returns results
  signal?: AbortSignal            // Cancellation
}
```

### `ResolvedIdentity`

```ts
interface ResolvedIdentity {
  provider: string                // Which provider found this
  did: string | null              // Resolved DID, if applicable
  label: string                   // Human-readable label
  type: IdentityType              // 'domain' | 'sbt' | 'attestation' | 'credential' | 'did' | 'score'
  meta: Record<string, unknown>   // Provider-specific metadata
}
```

## Writing a Provider

```ts
import type { IdentityProvider } from 'identity-resolver'

export function myProvider(opts: { apiUrl: string }): IdentityProvider {
  return {
    name: 'my-provider',
    chains: ['solana'],
    async resolve(ctx) {
      const res = await fetch(`${opts.apiUrl}/resolve/${ctx.address}`)
      const data = await res.json()
      return data.identities.map(i => ({
        provider: 'my-provider',
        did: i.did,
        label: i.name,
        type: 'credential',
        meta: i,
      }))
    },
  }
}
```

## Part of the Identity Middleware Stack

| Step | Package | Role |
|---|---|---|
| 1 | WalletConnect / Phantom | Connect wallet → get address |
| 2 | **identity-resolver** | Resolve address → DIDs, domains, credentials |
| 3 | [identity-bridge](https://npmjs.com/package/identity-bridge) | Discover credential wallets → VP exchange → verify |

## Security

No hardcoded endpoints. Every provider requires explicit URLs. See [SECURITY.md](https://github.com/Attestto-com/identity-resolver/blob/main/SECURITY.md).

## License

MIT
