# Nstdata IP Lookup

[简体中文](README_zh.md)

A Node.js library and CLI for IP information through Nstdata. No API key or runtime dependencies.

| Capability | Result |
|---|---|
| IPv4 / IPv6 lookup | Available location, network and provider classification fields. |
| Current IP | The address observed by the service for the request. |
| Optional in-memory cache | Bounded per-client TTL/LRU cache for explicit IP queries; disabled by default. |

## Requirements

Node.js 22.18+ in the 22.x line, or Node.js 24.x, with npm on PATH.

## CLI

### Run without a project

Run from any directory; no project installation is required:

```sh
npx --yes --package @nstdata-ai/ip-lookup@1.0.0 nstdata-ip-lookup --ip 1.1.1.1
npx --yes --package @nstdata-ai/ip-lookup@1.0.0 nstdata-ip-lookup --current
```

Inspect usage or the version without submitting an IP query:

```sh
npx --yes --package @nstdata-ai/ip-lookup@1.0.0 nstdata-ip-lookup --help
npx --yes --package @nstdata-ai/ip-lookup@1.0.0 nstdata-ip-lookup --version
```

`npx` may download the package. The CLI's `--help` and `--version` do not contact the lookup service.

### Install a global command

For repeated use from any directory:

```sh
npm install --global @nstdata-ai/ip-lookup
nstdata-ip-lookup --current
nstdata-ip-lookup --ip 2001:4860:4860::8888
```

Successful queries print JSON. See the [CLI options and exit codes](docs/guide.md#cli).

## Library

Install in your Node.js project:

```sh
npm install @nstdata-ai/ip-lookup
```

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
