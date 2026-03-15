# Contributing to wallet-identity-resolver

Thanks for your interest in expanding on-chain identity discovery.

## Getting Started

```bash
git clone https://github.com/chongkan/wallet-identity-resolver.git
cd wallet-identity-resolver
npm install
npm run lint    # Type-check
npm run build   # Build ESM + CJS + declarations
```

## Project Structure

```
src/
  index.ts              — Public API barrel export
  types.ts              — Core interfaces (IdentityProvider, ResolvedIdentity, etc.)
  resolve.ts            — Resolution engine (runs providers, handles timeouts)
  providers/
    index.ts            — Provider barrel export
    pkh.ts              — did:pkh fallback (all chains)
    sns.ts              — SNS domains → did:sns (Solana)
    ens.ts              — ENS domains → did:ens (Ethereum)
    civic.ts            — Civic Pass gateway tokens (Solana)
    attestto-ssid.ts    — Attestto SSID soulbound tokens (Solana)
    sas.ts              — Solana Attestation Service
```

## How to Contribute

### Adding a new provider

This is the most common contribution. To add support for a new identity source:

1. Create `src/providers/your-provider.ts`
2. Implement the `IdentityProvider` interface (see README for full example)
3. Export it from `src/providers/index.ts`
4. Re-export from `src/index.ts` for convenience
5. Add a row to the Built-in Providers table in README
6. Run `npm run lint && npm run build`
7. Submit a PR

**Provider checklist:**
- [ ] Factory function with typed options
- [ ] `chains` array specifying supported chains
- [ ] `resolve()` returns empty array on failure (never throws)
- [ ] Passes `ctx.signal` to all fetch calls
- [ ] Supports `ctx.rpcUrl` override where applicable
- [ ] JSDoc on the factory function
- [ ] Added to providers/index.ts and index.ts exports
- [ ] Documented in README

### Adding support for a new chain

1. No core changes needed — `Chain` type accepts any string
2. Add providers that support the new chain
3. Update the `CHAIN_PREFIXES` map in `pkh.ts` if the chain uses did:pkh
4. Document the chain in README

### Improving the core engine

The resolution engine in `resolve.ts` is intentionally simple. Proposals welcome for:
- Parallel provider execution (currently sequential)
- Caching layer
- Provider health checks
- Result deduplication across providers

Open an issue first to discuss before submitting a PR.

## See It In Action

The [DID Landscape Explorer](https://github.com/chongkan/did-landscape-explorer) uses this package in its self-assessment wizard. When a user connects a Web3 wallet, the explorer resolves all on-chain identities and lets the user pick which DID to sign their assessment with.

## Design Principles

- **Zero runtime dependencies** — providers use `fetch` only
- **Consumer controls everything** — which providers, which order, which chains
- **Providers are plugins** — anyone can write one without modifying core
- **Never throw** — providers return empty arrays on failure
- **Respect cancellation** — all async work honors `AbortSignal`

## Code Style

- TypeScript strict mode
- No runtime dependencies (devDependencies only)
- JSDoc on all public APIs
- One file per provider

## License

By contributing, you agree that your contributions will be licensed under MIT.
