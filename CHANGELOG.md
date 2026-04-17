# Changelog

All notable changes to `@attestto/identity-resolver` will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-04-15

### Changed
- **Breaking:** Renamed core package from `identity-resolver` to `@attestto/identity-resolver`.
- **Breaking:** Replaced `did:pkh` fallback provider with CAIP-10 provider. CAIP-10 is not a DID method — it is an honest representation of an unresolved chain account. Consumers should migrate from `didPkh()` to `caip10()`.

### Added
- CAIP-10 provider with auto-detected chain prefixes (Solana mainnet, Ethereum mainnet) and custom `chainId` override.
- Test suite: 15 tests covering resolution orchestration, provider ordering, chain filtering, wildcard chains, `stopOnFirst`, timeout handling, error resilience, AbortSignal cancellation, context passthrough, and the CAIP-10 provider.
- CI workflow for lint and build.

## [0.2.2] - 2026-04-12

### Fixed
- Package metadata: correct repository URL for npm display.

### Added
- README for core package (shown on npm).

## [0.2.1] - 2026-04-10

### Added
- SNS (Solana Name Service) provider moved into core package. Reverse-resolves `.sol` domains via Bonfida API. Returns `did:sns:<domain>` identities.

## [0.1.1] - 2026-04-08

### Fixed
- Repository URL pointing to correct Attestto-com org.
- Export condition order: `types` must come before `import`/`require` for TypeScript resolution.

## [0.1.0] - 2026-04-07

### Added
- Initial release: pluggable identity resolution engine for wallet addresses.
- Core `resolveIdentities()` function with ordered provider execution, per-provider timeouts, error isolation, `stopOnFirst`, and AbortSignal cancellation.
- Provider plugin interface (`IdentityProvider`) for building custom resolvers.
- Built-in providers: CAIP-10 (address fallback).
- Plugin packages: SNS, ENS, Civic Pass, Attestto Credentials, Solana Attestation Service.
- Monorepo structure (pnpm workspace) with dual ESM/CJS builds via tsup.
- SECURITY.md with proxy architecture for RPC endpoint privacy.
