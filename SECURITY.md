# Security Considerations

## No Hardcoded Endpoints

This package and all official providers enforce a strict **no hardcoded URLs**
policy. Every network call requires an explicit endpoint from the consumer.

If a provider is missing a required URL (`rpcUrl`, `apiUrl`, `resolverUrl`),
it returns an empty array — it never falls back to a public endpoint.

This prevents:
- Accidental API key exposure via public RPC defaults
- Traffic to unexpected third-party services
- CORS failures from browser-side calls to uncontrolled origins

## Backend Proxy Pattern (Required)

Providers run in the browser. All URLs you configure must either:
1. Point to **your own backend proxy** that holds API keys server-side
2. Point to CORS-enabled public endpoints you explicitly trust

```ts
// BAD — API key in browser, hits third-party directly
resolveIdentities({
  chain: 'solana',
  address: pubkey,
  rpcUrl: 'https://rpc.helius.xyz/?api-key=SECRET',
  providers: [sns({ apiUrl: 'https://sns-sdk-proxy.bonfida.workers.dev/v2' })],
})

// GOOD — your proxy holds keys, controls CORS
resolveIdentities({
  chain: 'solana',
  address: pubkey,
  providers: [
    sns({ apiUrl: 'https://api.yourapp.com/sns', resolverUrl: 'https://api.yourapp.com/resolver' }),
  ],
})
```

## CORS

All provider network calls use `fetch` and are subject to browser CORS policy.
Your backend proxy must set appropriate `Access-Control-Allow-Origin` headers
for the domains where your frontend runs.

## DID Resolution Trust

Providers that verify DID Documents (SNS with `requireDidDocument`, ENS with
`requireDidDocument`) use the `resolverUrl` you provide. This resolver is a
**trust anchor** — it must be infrastructure you control or explicitly trust.

Never let untrusted input determine the resolver URL. The DID method
specification defines where resolution happens:
- `did:web` → the domain in the DID
- `did:sns` → Solana on-chain registry
- `did:ens` → Ethereum on-chain registry

Your resolver should implement these method specs faithfully.

## Custom Providers

When writing custom providers:
- **Never hardcode endpoints** — accept all URLs via options
- **Never throw** — return empty arrays on failure
- **Always pass `ctx.signal`** to fetch calls for cancellation
- **Never log or expose** raw RPC responses that may contain sensitive data
- **Validate inputs** — sanitize the `address` parameter before using in URLs

## Reporting Vulnerabilities

Report security issues to security@attestto.com or open a private advisory
on the GitHub repository.
