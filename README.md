# Nstdata IP lookup

[中文](README_zh.md)

A library and CLI for IPv4/IPv6 lookups and the service-observed request IP. No API key or runtime dependency is required. Supports Node.js 22.18+ in the 22.x line, or Node.js 24.

## Install and run

Version `1.0.0` is prepared locally and not yet published. After publication, install with:

```sh
npm install @nstdata-ai/ip-lookup@1.0.0
npx --no-install nstdata-ip-lookup --ip 1.1.1.1
npx --no-install nstdata-ip-lookup --ip 2001:4860:4860::8888
npx --no-install nstdata-ip-lookup --current
```

Lookup commands make real requests. Choose one of `--ip`/`--current`; `--help` makes no request. `--timeout` is milliseconds. Exit codes: 0 success, 1 service/network failure, 2 invalid input/configuration.

`--current` reports the IP observed by the service; proxies/forwarding can affect it.

## Library

```js
import { lookupIp } from '@nstdata-ai/ip-lookup';
const result = await lookupIp('1.1.1.1', { timeoutMs: 10000 });
// result.information.query is the returned IP; requestedIp retains the input.
```

Options: `baseURL` (default `https://api.nstdata.io`), `timeoutMs` (10000), `maxResponseBytes` (1048576), `signal` and per-call `fetch`. The CLI exposes timeout and `NSTDATA_IP_LOOKUP_BASE_URL`. Custom URLs may include a path prefix, but no credentials, query or fragment. Custom fetch implementations must honor the supplied signal and `redirect: 'manual'`.

For repeated explicit-IP lookups, an optional client keeps a bounded memory cache:

```js
import { createIpLookup } from '@nstdata-ai/ip-lookup';
const client = createIpLookup({ cacheTtlMs: 60000, maxCacheEntries: 100 });
const result = await client.lookup('1.1.1.1');
client.clearCache();
```

Caching is off by default (`cacheTtlMs: 0`); enable it only where your service/data-use terms permit retention. TTL accepts integer milliseconds from 0 to 2147483647; capacity is a positive safe integer, default 100. Each client has its own cache and fixed request options; `lookup(ip, { signal })` supports cancellation. Only successful explicit-IP queries are stored, keyed by the exact input string. Current-IP queries always reach the service. Expired entries are not served, failures are not cached, and least recently used entries are evicted at capacity. Cache hits preserve the original retrieval time and return independent objects. No files, background timers or cross-client cache are used; `clearCache()` removes stored entries, not pending requests. The one-shot CLI does not cache.

## Results and limits

One GET calls `/api/v2/public/utility/ip-lookup`, with `ipOrHost` for a supplied IP. Requests are not retried or redirected. The service may rate-limit caller IPs; multiple clients can share that limit. HTTP400 is not automatically classified as rate limiting.

Results include `source`, `requestedIp` and `information`: query IP, available location/timezone/ISP/AS fields, and mobile/proxy/hosting flags. Missing fields stay omitted, null stays null, and false/zero are preserved. Location and proxy flags are provider assessments, not proof of identity or precise position.

`retrievedAt` is the client's UTC timestamp after reading and validating a service response; it is not the database update time. `sourceUpdatedAt` is null because the endpoint supplies no source update timestamp. `cached` identifies a local cache hit. Nstdata supplies the data; its backend implementation uses ip-api. The package's MIT license covers its code, not rights to the returned data. Confirm service/data-use terms before commercial use, retention or redistribution.

A deadline covers fetch and body consumption. The byte cap applies to decoded bodies; chunk/parser copies add overhead. TLS verification stays enabled. Errors expose safe code/status metadata, not raw upstream messages. Invalid signals fail with `INVALID_CONFIG` before a request; nonfinite API codes fail with `INVALID_RESPONSE`. Treat returned strings as untrusted data when displaying them.

## Development

See [Contributing](CONTRIBUTING.md) for source setup, local archive installation and package checks. Tests use synthetic fetch and loopback HTTP; package checks verify installed imports, CLI behavior and exported declarations.

[Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [MIT license](LICENSE)
