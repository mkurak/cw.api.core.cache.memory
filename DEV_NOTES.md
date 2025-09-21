# Developer Notes — cw.api.core.cache.memory

> Quick reference for future sessions when context is limited.

## Overview
- `MemoryCache` is the primary entry point; it offers TTL handling, maximum entry
  limits, tag-based invalidation, concurrency-safe `getOrSet`, and a `configure()`
  method to adjust defaults at runtime.
- No runtime dependencies. Targets Node.js 18+ with TypeScript sources compiled
  to ESM output under `dist/`.
- `cacheModule` and `useCache()` (in `src/module.ts`) integrate the cache with
  `cw.api.core.di`, registering a singleton instance on the container. `useCache()`
  accepts `cacheOptions` to tweak defaults and an optional `configure` callback for
  advanced adjustments.

## Design Notes
- **Storage** – uses `Map<string, CacheEntry<V>>`. Public enumeration helpers
  (`keys`, `entries`) prune expired entries before returning results.
- **TTL** – `defaultTtl` can be supplied via constructor options; per-entry `ttl`
  overrides are supported. Negative TTLs are normalised to zero so the entry
  expires immediately.
- **Ordering** – every `get` with `updateRecency` re-inserts the entry, so
  `maxEntries` eviction behaves like FIFO/LRU-lite.
- **Concurrency** – `getOrSet` deduplicates concurrent factory calls through the
  `pending` map. If the factory throws, the cache is not mutated and the error is
  re-thrown.
- **Tags** – `set` accepts `tags`; values are trimmed, deduplicated, and stored
  on the entry. `keysByTag` and `deleteByTag` operate against that set.
- **Runtime config** – `configure()` updates `defaultTtl`, `maxEntries`, `onEvict`,
  and `timeProvider`; `enforceSizeLimit()` runs immediately when `maxEntries` is
  tightened.
- **Observability** – `stats()` exposes hits/misses/evictions/pending counts.
  `onEvict` callbacks receive the key, reason (`expired`, `maxSize`, `manual`,
  `cleared`, `tag`), and metadata (timestamps, hit count, tags).

## Testing
- `tests/index.test.ts` covers TTL expiration, concurrent `getOrSet`,
  `maxEntries`, tag invalidation, manual deletions, and the runtime `configure()`
  adjustments. Time-sensitive tests use the injectable `timeProvider` option.
- `tests/module.test.ts` verifies DI integration (`cacheModule`, `useCache()`)
  always return the same singleton instance from the container.
- Jest runs in ESM mode via `ts-jest`. Use `import { jest } from '@jest/globals'`
  when mocking timers or factories.

## Scripts
- `npm run build` – TypeScript build targeting `dist/` via `tsconfig.build.json`.
- `npm run lint` – ESLint flat config over `src` and `tests`.
- `npm run test` / `npm run test:coverage` – Jest with `--experimental-vm-modules`.
- `npm run hooks:install` – sets up `.githooks` for format → lint → coverage.
- `npm version <type>` – bump version and create commit/tag (run `git push --follow-tags` afterwards).

## Future Ideas
- Eviction policies that honour `lastAccessedAt` more strictly (true LRU).
- Async-aware invalidation hooks or observers (`observe(key)` style API).
- Serialisation helpers to persist/restore cache state across restarts.
- Factory timeouts for `getOrSet` to avoid hanging on slow producers.
