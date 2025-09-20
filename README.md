# cw.api.core.cache.memory

In-memory cache utilities for the **cw.api** ecosystem. The package exposes a
single `MemoryCache` class that favours predictable behaviour, TTL support, and
small helper APIs for deduplicated value resolution.

## Highlights
- **Deterministic TTLs** – opt-in per entry or via `defaultTtl`, expiring items on
  demand while tracking eviction metrics.
- **Concurrency-safe `getOrSet`** – collapse overlapping production of the same
  key (sync or async factories).
- **Tag aware** – attach tags during `set`, query them later, or invalidate a
  whole tag group in one call.
- **Observability hooks** – receive eviction callbacks with metadata (hits,
  timestamps, tags) and inspect cache stats at any time.
- **Zero dependencies** – TypeScript first, Node.js >= 18 runtime.

## Installation

```bash
npm install cw.api.core.cache.memory
```

## Quick Start

```ts
import { MemoryCache } from 'cw.api.core.cache.memory';

const cache = new MemoryCache<string>({ defaultTtl: 1000 * 60 });

await cache.getOrSet('user:42', async () => {
    const profile = await loadUserFromDb('42');
    return JSON.stringify(profile);
});

cache.set('feature-flags', ['alpha'], { tags: ['config'], ttl: 5_000 });

console.log(cache.get('feature-flags')); // => ['alpha']
console.log(cache.keysByTag('config')); // => ['feature-flags']
```

## API Overview

### `MemoryCache`

```ts
const cache = new MemoryCache<Value>(options?: MemoryCacheOptions<Value>);
```

| Option | Description |
| ------ | ----------- |
| `defaultTtl` | Default time-to-live in milliseconds for new entries. `undefined` disables TTL. |
| `maxEntries` | Upper bound for stored entries. Oldest items are evicted first. |
| `onEvict` | Callback fired for every eviction with reason, value, timestamps, hits, and tags. |
| `timeProvider` | Overrideable clock (useful in tests). Defaults to `Date.now`. |

#### Core methods
- `set(key, value, options?)` – store a value with optional `ttl`/`tags`.
- `get(key)` / `peek(key)` / `has(key)` – read without or with hit accounting.
- `getOrSet(key, factory, options?)` – resolve value once and cache the result.
- `delete(key)` / `deleteByTag(tag)` / `clear()` – remove entries manually.
- `keys()` / `keysByTag(tag)` / `entries()` – inspect stored keys and values.
- `pruneExpired()` – eagerly remove spoiled entries (called automatically on most operations).
- `stats()` – returns `{ size, hits, misses, evictions, pending }`.

`set` accepts `{ ttl, tags }`; omit `ttl` to inherit the default. Tags are
normalised (trimmed, deduplicated) before storage.

## Testing & Tooling

```bash
npm run lint
npm run test:coverage
npm run build
```

Git hooks follow the shared cw workflow (format → lint → coverage). Run
`npm run hooks:install` after cloning to enable them locally.

## Release Flow

1. Update documentation (`README.md`, `DEV_NOTES.md`, `CHANGE_LOG.md`).
2. Validate via `npm run lint && npm run test:coverage && npm run build`.
3. Bump the version with `npm run release -- <type>` and push the generated
   commit + tag.
4. Publish through the shared GitHub Actions workflow or `npm publish
   --provenance` when required.

## License

MIT © 2025 Mert Kurak
