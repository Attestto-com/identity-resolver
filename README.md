# wallet-identity-resolver

Pluggable on-chain identity discovery for wallet addresses. Given a wallet address and chain, discover all DIDs, SBTs, attestations, and credentials attached to it.

The consumer decides which identity types to accept and in what priority — no hardcoded assumptions, no hardcoded endpoints.

## Monorepo Structure

```
packages/
  core/           → wallet-identity-resolver       (engine + pkh fallback)
  sns/            → @attestto/wir-sns              (SNS .sol domains → did:sns)
  ens/            → @attestto/wir-ens              (ENS .eth domains → did:ens)
  attestto-creds/ → @attestto/wir-attestto-creds   (KYC, SBTs, VCs)
  civic/          → @attestto/wir-civic            (Civic Pass gateway tokens)
  sas/            → @attestto/wir-sas              (Solana Attestation Service)
```

## Identity Middleware — not a wallet connector

WalletConnect, Dynamic, and Wagmi are **crypto wallet connectors**. They connect MetaMask, Phantom, and Ledger to dApps for **transaction signing**. Once connected, they give you an address and a signer. That's where they stop.

This package is the **identity layer that comes after**. It's DNS for compliance — given a wallet address, it resolves the full identity graph attached to it: DIDs, domains, KYC credentials, institutional attestations, soulbound tokens.

### Why this matters

A traditional bank operating under SWIFT/ISO 20022 cannot interact with a DeFi protocol using WalletConnect alone. Before allowing the transaction, the protocol needs to **resolve** the bank's `did:web` or vLEI credential to verify institutional identity and compliance status. No existing wallet connector does this.

```
┌──────────────────────────────────────────────────────────────────┐
│  1. WalletConnect / Phantom            → address + signer       │
│  2. wallet-identity-resolver           → DIDs, KYC, vLEI, SBTs │
│  3. credential-wallet-connector        → VP request + verify    │
└──────────────────────────────────────────────────────────────────┘
     Existing connectors ──┘    Identity middleware ──┘
```

### What you get vs. what exists

| | WalletConnect / Dynamic / Wagmi | wallet-identity-resolver |
|---|---|---|
| **Purpose** | Connect wallet, sign transactions | Resolve identities from an address |
| **Input** | User action (QR scan, click) | Wallet address (string) |
| **Output** | Signer + address | DID Documents, linked identities (`alsoKnownAs`), KYC status, institutional credentials |
| **When** | Before any interaction | After wallet connection |
| **Compliance** | None — no identity awareness | FATF Travel Rule, eIDAS 2.0, GLEIF vLEI ready |

### The full stack

1. **WalletConnect** → connect Solana/Ethereum wallet → get address
2. **wallet-identity-resolver** → resolve that address → find SNS domain, Attestto credentials, Civic pass, vLEI attestation
3. **[credential-wallet-connector](https://github.com/Attestto-com/credential-wallet-connector)** → discover credential wallet extensions → request Verifiable Presentation → verify cryptographically

Step 1 uses existing connectors. Steps 2–3 are what we built — the identity middleware that MetaMask, Phantom, and every crypto wallet are currently missing. By following W3C CHAPI and DIDComm v2 standards, this stack is already compatible with the regulatory direction of eIDAS 2.0 (EU), FATF Travel Rule, and jurisdictional digital identity wallet mandates.

## Install

```bash
# Core (required)
npm install wallet-identity-resolver

# Pick the providers you need
npm install @attestto/wir-sns @attestto/wir-attestto-creds @attestto/wir-civic
```

## Quick Start

```ts
import { resolveIdentities } from 'wallet-identity-resolver'
import { sns } from '@attestto/wir-sns'
import { attesttoCreds } from '@attestto/wir-attestto-creds'
import { civic } from '@attestto/wir-civic'
import { pkh } from 'wallet-identity-resolver'

const identities = await resolveIdentities({
  chain: 'solana',
  address: 'ATTEstto1234567890abcdef...',
  providers: [
    attesttoCreds({
      programId: 'YOUR_PROGRAM_ID',
      rpcUrl: 'https://api.yourapp.com/solana-rpc',
    }),
    sns({
      apiUrl: 'https://api.yourapp.com/sns',
      resolverUrl: 'https://api.yourapp.com/resolver',
    }),
    civic({ apiUrl: 'https://api.yourapp.com/civic' }),
    pkh(),  // Fallback — always resolves, no network calls
  ],
})
```

### Ethereum

```ts
import { resolveIdentities, pkh } from 'wallet-identity-resolver'
import { ens } from '@attestto/wir-ens'

const identities = await resolveIdentities({
  chain: 'ethereum',
  address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  providers: [
    ens({ resolverUrl: 'https://api.yourapp.com/resolver' }),
    pkh(),
  ],
})
```

## See It In Action

The [DID Landscape Explorer](https://github.com/chongkan/did-landscape-explorer) uses this package in its self-assessment wizard. When a user connects a Web3 wallet, the explorer resolves all identities attached to their address and lets them pick which DID to sign with.

## Security

**No hardcoded endpoints.** Every provider requires explicit URLs from the consumer. No provider ever makes a network call to an endpoint you didn't configure. See [SECURITY.md](SECURITY.md) for the full security model.

**Recommended architecture:**

```
Browser (no keys, no direct RPC)
  → Your backend proxy (holds API keys, validates origin)
    → Solana RPC / Bonfida / UniResolver / Civic
```

## API

### `resolveIdentities(options): Promise<ResolvedIdentity[]>`

```ts
interface ResolveOptions {
  chain: Chain                    // 'solana', 'ethereum', or custom
  address: string                 // Wallet address / public key
  providers: IdentityProvider[]   // Ordered list — defines priority
  rpcUrl?: string                 // Global RPC override (passed to providers)
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

## Packages

| Package | Chain | What it resolves | Required options |
|---|---|---|---|
| `wallet-identity-resolver` | any | Core engine + `pkh()` fallback | — |
| `@attestto/wir-sns` | Solana | SNS `.sol` domains → `did:sns` | `apiUrl`, `resolverUrl` |
| `@attestto/wir-ens` | Ethereum | ENS `.eth` domains → `did:ens` | `resolverUrl` |
| `@attestto/wir-attestto-creds` | Solana | Attestto KYC, identity SBTs, VCs | `programId`, `rpcUrl` |
| `@attestto/wir-civic` | Solana | Civic Pass gateway tokens | `apiUrl` |
| `@attestto/wir-sas` | Solana | Solana Attestation Service | `programId`, `rpcUrl` |

## Writing a Custom Provider

Any identity source can become a provider. Follow these steps:

### Step 1 — Define your options

Create an interface for the configuration your provider needs. All network endpoints must be **required** (no hardcoded URLs).

```ts
interface MyProviderOptions {
  /** Your API endpoint — consumer must provide this (required) */
  apiUrl: string
  /** Optional filter */
  category?: string
}
```

### Step 2 — Create the factory function

Export a function that takes your options and returns an `IdentityProvider`. This is the pattern every built-in provider follows.

```ts
import type { IdentityProvider } from 'wallet-identity-resolver'

export function myProvider(options: MyProviderOptions): IdentityProvider {
  return {
    name: 'my-provider',    // Unique name — shows up in ResolvedIdentity.provider
    chains: ['solana'],      // Which chains you support (use ['*'] for all chains)
    resolve: async (ctx) => {
      // ... (Step 3)
    },
  }
}
```

### Step 3 — Implement `resolve()`

The engine calls `resolve(ctx)` with the wallet address and chain. Your job:

1. Call your data source (API, RPC, on-chain program)
2. Map results to `ResolvedIdentity[]`
3. Return `[]` if nothing found — **never throw**

```ts
import type { IdentityProvider, ResolveContext, ResolvedIdentity } from 'wallet-identity-resolver'

export function myProvider(options: MyProviderOptions): IdentityProvider {
  return {
    name: 'my-provider',
    chains: ['solana'],

    async resolve(ctx: ResolveContext): Promise<ResolvedIdentity[]> {
      // ctx.chain   — 'solana', 'ethereum', etc.
      // ctx.address — the wallet public key / address
      // ctx.rpcUrl  — optional RPC override from the consumer
      // ctx.signal  — AbortSignal for cancellation (pass to fetch!)

      try {
        const res = await fetch(
          `${options.apiUrl}/lookup/${ctx.address}`,
          { signal: ctx.signal },
        )
        if (!res.ok) return []

        const data = await res.json() as { items: Array<{ name: string; did?: string }> }
        if (!data.items?.length) return []

        return data.items.map((item) => ({
          provider: 'my-provider',       // Must match the name above
          did: item.did ?? null,         // DID string, or null if not applicable
          label: item.name,              // Human-readable label for display
          type: 'credential' as const,   // 'domain' | 'sbt' | 'attestation' | 'credential' | 'did' | 'score'
          meta: { raw: item },           // Anything extra — consumers access via meta
        }))
      } catch {
        return []  // Never throw — return empty on failure
      }
    },
  }
}
```

### Step 4 — Use it

Pass your provider to `resolveIdentities` alongside any others. Order = priority.

```ts
import { resolveIdentities, pkh } from 'wallet-identity-resolver'
import { myProvider } from './my-provider'

const identities = await resolveIdentities({
  chain: 'solana',
  address: pubkey,
  providers: [
    myProvider({ apiUrl: 'https://my-backend.com/api/lookup' }),
    pkh(), // always-available fallback
  ],
})
```

### Step 5 (optional) — Publish as a package

To share your provider as an npm package:

1. Name it `@yourorg/wir-<name>` (convention, not required)
2. Add `wallet-identity-resolver` as a **peer dependency** for type compatibility
3. Export your factory function + options interface

```json
{
  "name": "@yourorg/wir-my-provider",
  "peerDependencies": {
    "wallet-identity-resolver": "^0.1.0"
  }
}
```

### Provider Rules

| Rule | Why |
|---|---|
| **No hardcoded URLs** | Consumer controls infrastructure, keys, CORS |
| **Never throw from `resolve()`** | One broken provider must not crash the chain |
| **Return `[]` on failure** | Empty = nothing found, engine moves on |
| **Pass `ctx.signal` to fetch** | Supports cancellation and timeouts |
| **Use `meta` for extras** | Don't extend `ResolvedIdentity` — put provider-specific data in `meta` |
| **One provider = one source** | Keep providers focused (SNS, Civic, etc.) |

## Development

```bash
pnpm install
pnpm run build    # Build all packages
pnpm run lint     # Type-check all packages
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
