# Changelog

## 1.0.0

- Add standalone CLI installation, detailed help and a network-free version command.
- Normalize invalid option containers to `INVALID_CONFIG` at all public entry points.
- Add bilingual CLI, result, request, cache and error guides; verify installed examples.

- Optional bounded per-client memory cache with explicit TTL, least-recently-used eviction, independent results and clearing; disabled by default and bypassed for current-IP queries.
- Client retrieval timestamps, explicit unknown source update time and cache-hit metadata; document data provenance and retention limits.
- Single IPv4/IPv6 or service-observed request-IP query using the existing public Nstdata endpoint.
- Zero-dependency ESM library, declarations and CLI with explicit structured results/exit codes.
- Whole-call cancellation/deadline, decoded-body cap and safe errors; no retries or redirects.
- Validate cancellation signals before dispatch and reject nonfinite API codes with safe errors.
- Verify native response-reader and connection cleanup when deadline/cancellation occurs during body consumption.
- Synthetic/loopback tests and allowlisted package checks.
- Verify the installed tarball outside source: public imports, CLI behavior and exported TypeScript declarations, with an empty installation cache.
