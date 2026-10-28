# Nstdata IP Lookup

[简体中文](README_zh.md)

A Node.js library and CLI for IP information through Nstdata. No API key or runtime dependencies.

| Capability | Result |
|---|---|
| IPv4 / IPv6 lookup | Available location, network and provider classification fields. |
| Current IP | The address observed by the service for the request. |
| Optional in-memory cache | Bounded per-client TTL/LRU cache for explicit IP queries; disabled by default. |

## Install

Requires Node.js 22.18+ in the 22.x line, or Node.js 24.x.

```sh
npm install @nstdata-ai/ip-lookup
```

## CLI

```sh
npx --no-install nstdata-ip-lookup --ip 1.1.1.1
npx --no-install nstdata-ip-lookup --ip 2001:4860:4860::8888
npx --no-install nstdata-ip-lookup --current
```

Successful queries print JSON. `--help` runs without a network request. See the [CLI options and exit codes](docs/guide.md#cli).

## Library

Save as `lookup.mjs`:

```js
import { lookupIp, IpLookupError } from '@nstdata-ai/ip-lookup';

try {
    const result = await lookupIp('1.1.1.1');
    console.log(result.information);
} catch (error) {
    if (!(error instanceof IpLookupError)) throw error;
    console.error({ code: error.code });
    process.exitCode = 1;
}
```

```sh
node lookup.mjs
```

Queries contact Nstdata. Current-IP results can reflect proxies or forwarding; location and proxy flags are provider estimates. The code's MIT license does not grant rights to returned data.

[Usage guide](docs/guide.md) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [Security](SECURITY.md) · [License](LICENSE)
