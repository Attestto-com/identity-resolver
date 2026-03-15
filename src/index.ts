export { resolveIdentities } from './resolve'
export type {
  Chain,
  ResolvedIdentity,
  IdentityType,
  ResolveContext,
  IdentityProvider,
  ResolveOptions,
} from './types'

// Built-in provider (zero dependencies, always available)
export { pkh } from './providers'
