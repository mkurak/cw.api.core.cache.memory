# Changelog

## [0.3.6] - 2025-09-21
### Changed
- Pre-commit hook now runs format, lint, coverage, build, and smoke (`node scripts/smoke.mjs`) to block invalid deployments.

## [0.3.5] - 2025-09-21
### Changed
- Pre-commit hook now fails unless format, lint, coverage, build, and smoke (node scripts/smoke.mjs) all succeed.

### Changed
- Removed automatic post-commit tagging; commits now leave tag management entirely manual.

## [0.3.4] - 2025-09-21
### Changed
- Simplified the pre-commit hook to run only format, lint, and coverage checks.

## [0.3.3] - 2025-09-21
### Added
- Introduced a smoke test that exercises basic `MemoryCache` operations to catch regressions early.
### Changed
- Release notes now reference `npm version <type>` followed by `git push --follow-tags` for publishing.

## [0.3.2] - 2025-09-21
### Changed
- Removed the `release` npm script and updated documentation to reference `npm version <type>` + `git push --follow-tags`.

## [0.3.1] - 2025-09-20
- Added a runtime `configure()` API so cache defaults (TTL, max entries, eviction handler, time provider) can change without reinstantiation.
- Updated `useCache()` to honour only the first `cacheOptions` configuration for the shared singleton, logging subsequent attempts.
- Introduced `createMemoryCache()` for callers that require isolated cache instances.
- Refreshed documentation and tests to cover the new configuration workflow.

## [0.3.0] - 2025-09-20
- Added a runtime `configure()` API so cache defaults (TTL, max entries, eviction handler, time provider) can change without reinstantiation.
- Updated `useCache()` to honour only the first `cacheOptions` configuration for the shared singleton, logging subsequent attempts.
- Introduced `createMemoryCache()` for callers that require isolated cache instances.
- Refreshed documentation and tests to cover the new configuration workflow.

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
