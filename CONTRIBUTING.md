# Contributing

Use Node.js 22.18+ in the 22.x line, or Node.js 24:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
npm run check:package
npm pack
```

Before publication, install the approved local archive in a separate project:

```sh
npm install /PATH/TO/nstdata-ai-ip-lookup-1.0.0.tgz
```

Keep package metadata, lockfile, README installation version and CHANGELOG aligned.

Keep offline tests synthetic/loopback and never add keys or internal plans.

Preserve actual provider fields, null/false/zero and source attribution.

Endpoint changes need public source/documentation evidence; do not invent data precision or call a real service in CI.

Package checks install the tarball outside the source tree with an empty npm cache, verify the exact installed files, run regressions and bilingual examples, and compile the exported declarations. Pass an existing tarball after `npm run check:package --` to check that fixed archive. Tests restrict native fetch to loopback; synthetic fetch handles other fixtures. No real lookup service is contacted.

Report vulnerabilities through the [security policy](SECURITY.md). Publication and remote writes require explicit authorization.
