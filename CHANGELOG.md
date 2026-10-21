# Changelog

## 1.0.0 — Unreleased

- Single IPv4/IPv6 or service-observed request-IP query using the existing public Nstdata endpoint.
- Zero-dependency ESM library, declarations and CLI with explicit structured results/exit codes.
- Whole-call cancellation/deadline, decoded-body cap and safe errors; no retries or redirects.
- Validate cancellation signals before dispatch and reject nonfinite API codes with safe errors.
- Verify native response-reader and connection cleanup when deadline/cancellation occurs during body consumption.
- Synthetic/loopback tests and allowlisted package checks.
- Verify the installed tarball outside source: public imports, CLI behavior and exported TypeScript declarations, with an empty installation cache.
