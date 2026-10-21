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

Package checks install the tarball outside the source tree with an empty npm cache, exercise the public import and installed CLI using the same offline regressions, and compile a consumer against the exported declarations. No real lookup service is contacted.

Publication and remote writes require explicit authorization.
