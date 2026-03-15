# wallet-identity-resolver

Pluggable on-chain identity discovery for wallet addresses. Given a wallet address and chain, discover all DIDs, SBTs, attestations, and credentials attached to it.

The consumer decides which identity types to accept and in what priority — no hardcoded assumptions.

## Install

```bash
npm install wallet-identity-resolver
```

## Quick Start

```ts
import { resolveIdentities } from 'wallet-identity-resolver'
import { sns, civic, attesttoSsid, pkh } from 'wallet-identity-resolver/providers'

const identities = await resolveIdentities({
  chain: 'solana',
  address: 'ATTEstto1234567890abcdef...',
  providers: [
    attesttoSsid({ programId: 'YOUR_PROGRAM_ID' }),
    sns({ requireDidDocument: true }),
    civic(),
    pkh(),  // Fallback — always resolves
  ],
})

// Returns:
// [
//   { provider: 'attestto-ssid', did: 'did:sns:alice.sol', label: 'alice.sol', type: 'sbt', ... },
//   { provider: 'sns', did: 'did:sns:alice.sol', label: 'alice.sol', type: 'domain', ... },
//   { provider: 'civic', did: null, label: 'Civic Pass', type: 'sbt', ... },
//   { provider: 'pkh', did: 'did:pkh:solana:ATTEstto...', label: 'ATTEst...cdef', type: 'did', ... },
// ]
```

### Ethereum

```ts
import { resolveIdentities } from 'wallet-identity-resolver'
import { ens, pkh } from 'wallet-identity-resolver/providers'

const identities = await resolveIdentities({
  chain: 'ethereum',
  address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  providers: [
    ens({ requireDidDocument: true }),
    pkh(),
  ],
})
```

## See It In Action

The [DID Landscape Explorer](https://github.com/chongkan/did-landscape-explorer) uses this package in its self-assessment wizard. When a user connects a Web3 wallet, the explorer resolves all identities attached to their address and lets them pick which DID to sign with.

## API

### `resolveIdentities(options: ResolveOptions): Promise<ResolvedIdentity[]>`

Run all configured providers in order and collect discovered identities.

```ts
interface ResolveOptions {
  chain: Chain                    // 'solana', 'ethereum', or custom
  address: string                 // Wallet address / public key
  providers: IdentityProvider[]   // Ordered list — defines priority
  rpcUrl?: string                 // RPC endpoint override
  timeoutMs?: number              // Per-provider timeout (default 5000ms)
  stopOnFirst?: boolean           // Stop after first provider returns results
  signal?: AbortSignal            // Cancellation
}
```

### `ResolvedIdentity`

```ts
interface ResolvedIdentity {
  provider: string                // Which provider found this ('sns', 'civic', etc.)
  did: string | null              // Resolved DID, if applicable
  label: string                   // Human-readable label
  type: IdentityType              // 'domain' | 'sbt' | 'attestation' | 'credential' | 'did' | 'score'
  meta: Record<string, unknown>   // Provider-specific metadata
}
```

## Built-in Providers

| Provider | Chain | Type | What it resolves |
|---|---|---|---|
| `sns()` | Solana | domain | SNS `.sol` domains → `did:sns` (optionally requires DID Document) |
| `ens()` | Ethereum | domain | ENS `.eth` domains → `did:ens` |
| `attesttoSsid()` | Solana | sbt | Attestto SSID soulbound token → verified DID binding |
| `civic()` | Solana | sbt | Civic Pass gateway token (KYC verification) |
| `sas()` | Solana | attestation | Solana Attestation Service — vLEI, DID, custom schemas |
| `pkh()` | any | did | `did:pkh` derived from raw address (always-available fallback) |

### Provider Options

#### `sns(options?)`
```ts
sns({
  requireDidDocument: true,  // Only return domains with a DID Document (default true)
  apiUrl: 'https://...',     // Custom reverse lookup endpoint
})
```

#### `ens(options?)`
```ts
ens({
  requireDidDocument: false, // Check for DID Document (default false)
  rpcUrl: 'https://...',    // Ethereum RPC endpoint
})
```

#### `attesttoSsid(options)`
```ts
attesttoSsid({
  programId: 'YOUR_PROGRAM_ID',  // Required: Solana program ID
  rpcUrl: 'https://...',         // RPC override
  apiUrl: 'https://...',         // Attestto API endpoint (optional)
})
```

#### `civic(options?)`
```ts
civic({
  gatekeeperNetwork: '...',  // Civic network (default: mainnet)
  apiUrl: 'https://...',     // API override
})
```

#### `sas(options?)`
```ts
sas({
  programId: '...',          // SAS program ID
  schemaIds: ['...'],        // Filter by specific attestation schemas
  apiUrl: 'https://...',     // API override
})
```

#### `pkh(options?)`
```ts
pkh({
  chainPrefix: 'eip155:1',  // Override CAIP-2 chain prefix
})
```

## Writing a Custom Provider

Any identity source can be added as a provider. Implement the `IdentityProvider` interface:

```ts
import type { IdentityProvider, ResolvedIdentity, ResolveContext } from 'wallet-identity-resolver'

export function myProvider(options: { apiKey: string }): IdentityProvider {
  return {
    name: 'my-provider',
    chains: ['solana'],  // Which chains you support (use ['*'] for all)

    async resolve(ctx: ResolveContext): Promise<ResolvedIdentity[]> {
      // ctx.chain    — target chain
      // ctx.address  — wallet address
      // ctx.rpcUrl   — RPC endpoint (if provided)
      // ctx.signal   — AbortSignal for cancellation

      const data = await fetch(`https://myapi.com/lookup/${ctx.address}`, {
        headers: { 'X-API-Key': options.apiKey },
        signal: ctx.signal,
      })

      if (!data.ok) return []  // Return empty, never throw

      const result = await data.json()

      return [{
        provider: 'my-provider',
        did: result.did ?? null,
        label: result.name,
        type: 'credential',
        meta: { raw: result },
      }]
    },
  }
}
```

Then consumers use it like any built-in provider:

```ts
import { resolveIdentities } from 'wallet-identity-resolver'
import { myProvider } from './my-provider'
import { pkh } from 'wallet-identity-resolver/providers'

const identities = await resolveIdentities({
  chain: 'solana',
  address: pubkey,
  providers: [myProvider({ apiKey: '...' }), pkh()],
})
```

### Provider Guidelines

- **Never throw** — return an empty array if nothing found or if an error occurs
- **Respect `ctx.signal`** — pass it to all fetch calls for cancellation support
- **Keep it focused** — one provider = one identity source
- **Include metadata** — put provider-specific data in the `meta` field
- **Support `rpcUrl`** — let consumers override the RPC endpoint

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
