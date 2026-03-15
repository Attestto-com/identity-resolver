# Contributing to identity-resolver

Thanks for your interest in expanding on-chain identity discovery.

## Getting Started

```bash
git clone https://github.com/Attestto-com/identity-resolver.git
cd identity-resolver
pnpm install
pnpm run build    # Build all packages
pnpm run lint     # Type-check all packages
```

## Monorepo Structure

```
packages/
  core/              → identity-resolver        (engine + pkh fallback)
  sns/               → @attestto/wir-sns               (SNS .sol domains)
  ens/               → @attestto/wir-ens               (ENS .eth domains)
  civic/             → @attestto/wir-civic             (Civic Pass tokens)
  attestto-creds/    → @attestto/wir-attestto-creds    (Attestto credentials + SBTs)
  sas/               → @attestto/wir-sas               (Solana Attestation Service)
```

## Adding a New Provider

The most common contribution. Each provider lives in its own package under `packages/`.

### Checklist

- [ ] Create `packages/<name>/` with `src/index.ts`, `package.json`, `tsconfig.json`
- [ ] Export a factory function that returns `IdentityProvider`
- [ ] Set `identity-resolver` as a **peer dependency**
- [ ] Options interface: all endpoints are **required** (no hardcoded URLs)
- [ ] `resolve()` never throws — returns `[]` on failure
- [ ] `resolve()` respects `ctx.signal` for cancellation (pass to `fetch`)
- [ ] `resolve()` supports `ctx.rpcUrl` override where applicable
- [ ] Provider-specific data goes in `meta`, not custom fields
- [ ] `name` field is unique and matches the package shortname
- [ ] `chains` array correctly lists supported chains
- [ ] JSDoc on the factory function
- [ ] Add the provider to the root README (Monorepo Structure + Packages table)
- [ ] Package builds with `pnpm run build`
- [ ] Types export cleanly (factory function + options interface)

### Package Template

```json
{
  "name": "@attestto/wir-<name>",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts --clean",
    "lint": "tsc --noEmit"
  },
  "peerDependencies": {
    "identity-resolver": "workspace:^"
  },
  "devDependencies": {
    "identity-resolver": "workspace:^",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0"
  }
}
```

See the README's **Writing a Custom Provider** section for a full step-by-step walkthrough with code.

### Adding support for a new chain

1. No core changes needed — `Chain` type accepts any string
2. Add providers that support the new chain
3. Update the `CHAIN_PREFIXES` map in `packages/core/src/providers/pkh.ts` if the chain uses `did:pkh`
4. Document the chain in README

### Improving the core engine

The resolution engine in `packages/core/src/resolve.ts` is intentionally simple. Proposals welcome for:
- Parallel provider execution (currently sequential)
- Caching layer
- Provider health checks
- Result deduplication across providers

Open an issue first to discuss before submitting a PR.

## See It In Action

The [DID Landscape Explorer](https://github.com/chongkan/did-landscape-explorer) uses this package in its self-assessment wizard. When a user connects a Web3 wallet, the explorer resolves all on-chain identities and lets the user pick which DID to sign with.

## Design Principles

- **Zero runtime dependencies** — providers use `fetch` only
- **Consumer controls everything** — which providers, which order, which endpoints
- **Providers are plugins** — anyone can write one without modifying core
- **Never throw** — providers return empty arrays on failure
- **Respect cancellation** — all async work honors `AbortSignal`

## Code Style

- TypeScript strict mode
- No runtime dependencies (devDependencies only)
- JSDoc on all public APIs
- One package per provider

## License

By contributing, you agree that your contributions will be licensed under MIT.
