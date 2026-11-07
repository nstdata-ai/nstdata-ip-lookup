# Contributing

Use Node.js 22.18+ in the 22.x line, or Node.js 24:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
npm run check:package
npm pack --ignore-scripts
```

Install the reviewed archive in a separate project before publication:

```sh
npm install --ignore-scripts /absolute/path/to/reviewed-package.tgz
```

Keep package metadata, lockfile, README commands and CHANGELOG aligned. Preserve actual provider fields and `null`, `false` and zero values. Endpoint changes need public source or documentation evidence; do not invent data precision or contact a real lookup service in CI.

## Validation

Tests use synthetic or loopback services. Keep credentials, private responses and internal plans out of fixtures and packages.

Package checks install the tarball outside the source tree with an empty npm cache, verify exact installed files, run regressions and bilingual examples, and compile exported declarations. Pass an existing tarball after `npm run check:package --` to check that fixed archive. Tests restrict native fetch to loopback; synthetic fetch handles other fixtures. No real lookup service is contacted.

Report vulnerabilities through the [security policy](SECURITY.md).

## Releases

Release only reviewed source and archives after CI passes. The first npm publication and later trusted-publishing releases use different setup steps.

### First publication

The package owner publishes the reviewed archive using their own npm login and two-factor authentication. Confirm the public GitHub repository, package name, access and archive integrity first. Do not create a placeholder version to enable automation.

The workflow below requires an existing public npm package; it does not perform this initial account-authenticated publication.

### Trusted publishing

After the first publication, configure [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) with:

| Setting | Value |
|---|---|
| Organization | `nstdata-ai` |
| Repository | `nstdata-ip-lookup` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Permission | `npm publish` |

In GitHub, configure `npm-production` with a required reviewer, allow only the `main` branch, and disable administrator bypass. No npm token is needed. Complete the binding close to the next release so its validation deadline is met.

### Subsequent releases

Manually dispatch **Publish npm** from `main`, supplying the stable version in `package.json` and the full reviewed commit SHA. The workflow checks the source and environment, produces one archive, and records its integrity. The environment reviewer approves publication of those exact bytes.

`npm publish` runs once, with retries disabled. The workflow finishes when publication succeeds; public registry availability, archive integrity and installation are checked separately. If publication fails or the outcome is uncertain, inspect the registry version and integrity before another attempt. Do not overwrite or blindly republish a version.
