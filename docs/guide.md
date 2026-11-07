# IP Lookup guide

[简体中文](guide_zh.md) · [Quick start](../README.md)

## Library API

| Entry | Behavior |
|---|---|
| `lookupIp(ip?, options?)` | One query, without local caching. Omit `ip` for the service-observed request IP. |
| `createIpLookup(options?)` | Create a client with fixed request settings and an optional process-local cache. |
| `client.lookup(ip?, { signal }?)` | Query through that client; current-IP queries always bypass its cache. |
| `client.clearCache()` | Clear stored entries; does not cancel requests already in progress. |

Inputs are literal IPv4 or IPv6 addresses. Hostnames, URLs and blank strings are rejected. Options must be non-null objects; arrays and primitive values fail with `INVALID_CONFIG`.

## CLI

For one-shot or global installation, see [CLI setup](../README.md#cli). After installing the package in a project, use its local command:

```sh
npx --no-install nstdata-ip-lookup --ip 1.1.1.1
```

Choose exactly one of `--ip <address>` and `--current` for a query. Use an information option on its own.

| Option | Meaning |
|---|---|
| `--ip <IPv4-or-IPv6>` | Query an explicit IP. |
| `--current` | Query the address observed by the service; not necessarily the machine's direct public IP. |
| `--timeout <milliseconds>` | Positive integer deadline, up to 2147483647; default 10000. |
| `--help`, `-h` | Print usage without a lookup. |
| `--version` | Print the package version without a lookup. |

Success writes one JSON result to stdout. Failure writes `{ "error": { "code": "…" } }` to stderr, with available `statusCode` / `apiCode`. Exit codes: 0 success or information output, 1 service/network failure, 2 input/configuration error. No arguments or mixed information/query options are input errors. `NSTDATA_IP_LOOKUP_BASE_URL` optionally overrides the CLI API origin for testing; normally leave it unset.

## Result

| Field | Meaning |
|---|---|
| `source` | `nstdata-public-ip-lookup`: identifies the Nstdata interface, not a downstream dataset. |
| `requestedIp` | Original input string, or `null` for a current-IP query. |
| `information.query` | Valid IP returned by the service. |
| `information` optional fields | Only fields present in the response; missing fields are omitted and `null`, `false`, `0` are preserved. |
| `retrievedAt` | UTC time after the client read and validated the response; unchanged on cache hits. |
| `sourceUpdatedAt` | `null`; the interface provides no source update timestamp. |
| `cached` | Whether this result came from this client's local cache. |

Optional information fields:

| Group | Fields |
|---|---|
| Location | `continent`, `continentCode`, `country`, `countryCode`, `region`, `regionName`, `city`, `district`, `zip`, `lat`, `lon` |
| Time | `timezone`, `offset` |
| Network | `isp`, `org`, `as`, `asname`, `reverse` |
| Other | `currency`, `mobile`, `proxy`, `hosting` |

Strings, finite numbers and booleans are validated according to their declared types; all optional fields can be `null`. Unknown fields are not exposed. An absent proxy flag does not mean `false`; classifications and approximate locations are not identity or precise-location evidence.

## Request settings

`lookupIp` accepts the settings below. `createIpLookup` accepts the same settings except `signal`; pass cancellation to each `client.lookup` call.

| Setting | Default / constraint |
|---|---|
| `baseURL` | `https://api.nstdata.io`; HTTP or HTTPS base with an optional path prefix, without credentials, query or fragment. Use HTTPS for remote services. |
| `timeoutMs` | 10000; integer from 1 to 2147483647, covering request and response-body reading. |
| `maxResponseBytes` | 1048576; positive safe-integer limit on decoded response bytes. Chunk storage and parsing require additional memory. |
| `signal` | Optional `AbortSignal`; cancellation before the request sends nothing. |
| `fetch` | Native `fetch`; a replacement must honor the passed signal and `redirect: 'manual'`. |

Queries use `GET /api/v2/public/utility/ip-lookup`, adding `ipOrHost` for an explicit IP. Requests are not automatically retried and redirects are not followed. Caller-IP rate limits may be shared by multiple clients; an HTTP400 response alone does not identify rate limiting. TLS validation remains enabled for HTTPS. Local cancellation does not cancel server processing.

## Optional cache

Enable storage only when the service and data-use terms permit retention.

```js
import { createIpLookup } from '@nstdata-ai/ip-lookup';

const client = createIpLookup({ cacheTtlMs: 60000, maxCacheEntries: 100 });
const first = await client.lookup('1.1.1.1');
const second = await client.lookup('1.1.1.1');
console.log({ firstCached: first.cached, secondCached: second.cached });
client.clearCache();
```

| Setting | Default / constraint |
|---|---|
| `cacheTtlMs` | 0, disabled; integer from 0 to 2147483647 milliseconds. |
| `maxCacheEntries` | 100; positive safe integer. |

Only successful explicit-IP queries are cached, keyed by the original input string. Equivalent IPv6 spellings can have separate entries. TTL starts when the validated result is stored and uses a monotonic clock. Expired entries are not returned; failures are not cached. At capacity the least recently used entry is removed. Concurrent misses are independent requests, with no request coalescing.

Each client owns its cache. Returned objects are isolated from stored values; cache hits preserve retrieval time. Current-IP queries always reach the service. There is no file persistence, shared global cache or background timer. The CLI does not cache.

## Errors and data use

Catch `IpLookupError` and inspect `code`; do not depend on message wording.

| Code | Meaning |
|---|---|
| `INVALID_IP`, `INVALID_CONFIG` | Invalid target or client/call settings. |
| `CANCELLED`, `TIMEOUT` | Caller cancellation or client deadline. |
| `HTTP_ERROR` | Unsuccessful HTTP status, including redirects; inspect `statusCode`. |
| `API_ERROR` | Service envelope reports failure; inspect `statusCode` and `apiCode`. |
| `INVALID_RESPONSE` | Invalid UTF-8, JSON, envelope, source status or known-field types. |
| `RESPONSE_LIMIT` | Response exceeds the configured byte limit. |
| `NETWORK_ERROR` | Connection or body-reading failure. |

Errors do not include raw response content or upstream diagnostics. Treat returned strings as untrusted when displaying them. Data coverage and use terms are separate from the package's MIT code license; confirm commercial use, retention and redistribution conditions with the service provider before relying on returned data.
