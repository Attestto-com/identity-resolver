export { resolveIdentities } from './resolve'
export type {
  Chain,
  ResolvedIdentity,
  IdentityType,
  ResolveContext,
  IdentityProvider,
  ResolveOptions,
} from './types'

// Re-export providers for convenience (also available via /providers subpath)
export { pkh, sns, ens, civic, attesttoSsid, sas } from './providers'
