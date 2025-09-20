# Changelog

## [0.3.0] - 2025-09-20
- Added runtime `configure()` API to adjust cache defaults (TTL, max entries, eviction handler, time provider).
- Enhanced `useCache()` with `cacheOptions` so DI consumers can provide defaults without manual wiring.
- Extended documentation and tests to cover the new configuration flow.

## [0.2.1] - 2025-09-20
- Updated the GitHub Actions publish workflow to align with provenance-enabled
  npm publishing and Node.js 20.

## [0.2.0] - 2025-09-20
- Added the `cacheModule` export and the `useCache()` helper to register
  `MemoryCache` as a singleton inside `cw.api.core.di`.
- Documented DI usage and expanded developer notes with module details.
- Introduced `tests/module.test.ts` to cover the DI integration path.

## [0.1.0] - 2025-09-20
- Initial release scaffolded by `cw-package-gen` with TTL-aware `MemoryCache`,
  tag APIs, `getOrSet` deduplication, and observability helpers.
- Established Jest/ESLint/Prettier tooling and baseline documentation.
