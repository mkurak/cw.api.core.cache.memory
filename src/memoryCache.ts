export type CacheKey = string;

export type EvictionReason = 'expired' | 'maxSize' | 'manual' | 'cleared' | 'tag';

export interface CacheEntryMetadata {
    createdAt: number;
    lastAccessedAt: number;
    expiresAt?: number;
    hits: number;
    tags: readonly string[];
}

export interface CacheEviction<V> {
    key: CacheKey;
    value: V;
    reason: EvictionReason;
    metadata: CacheEntryMetadata;
}

export interface MemoryCacheOptions<V> {
    defaultTtl?: number | null;
    maxEntries?: number | null;
    onEvict?: (payload: CacheEviction<V>) => void;
    timeProvider?: () => number;
}

export interface SetOptions {
    ttl?: number;
    tags?: readonly string[];
}

export interface CacheStats {
    size: number;
    hits: number;
    misses: number;
    evictions: number;
    pending: number;
}

interface CacheEntry<V> {
    value: V;
    expiresAt: number | null;
    createdAt: number;
    lastAccessedAt: number;
    hits: number;
    tags: Set<string>;
}

interface ResolvedOptions<V> {
    defaultTtl?: number;
    maxEntries?: number;
    onEvict?: (payload: CacheEviction<V>) => void;
    timeProvider: () => number;
}

export class MemoryCache<V> {
    private readonly store = new Map<CacheKey, CacheEntry<V>>();
    private readonly pending = new Map<CacheKey, Promise<V>>();
    private readonly options: ResolvedOptions<V>;
    private readonly metrics = { hits: 0, misses: 0, evictions: 0 };

    constructor(options: MemoryCacheOptions<V> = {}) {
        this.options = {
            defaultTtl: normalizeTtl(options.defaultTtl),
            maxEntries: normalizeMaxEntries(options.maxEntries),
            onEvict: options.onEvict,
            timeProvider: options.timeProvider ?? Date.now
        };
    }

    configure(options: Partial<MemoryCacheOptions<V>>): void {
        if (Object.prototype.hasOwnProperty.call(options, 'defaultTtl')) {
            this.options.defaultTtl = normalizeTtl(options.defaultTtl);
        }

        if (Object.prototype.hasOwnProperty.call(options, 'maxEntries')) {
            this.options.maxEntries = normalizeMaxEntries(options.maxEntries);
            this.enforceSizeLimit();
        }

        if (Object.prototype.hasOwnProperty.call(options, 'onEvict')) {
            this.options.onEvict = options.onEvict;
        }

        if (Object.prototype.hasOwnProperty.call(options, 'timeProvider')) {
            this.options.timeProvider = options.timeProvider ?? Date.now;
        }
    }

    get size(): number {
        this.pruneExpired();
        return this.store.size;
    }

    set(key: CacheKey, value: V, options?: SetOptions): V {
        this.pruneExpired();
        const now = this.options.timeProvider();
        const ttl = options?.ttl ?? this.options.defaultTtl;
        const expiresAt = ttl === undefined ? null : now + Math.max(0, ttl);
        const tags = new Set<string>();
        if (options?.tags) {
            for (const tag of options.tags) {
                const normalized = tag.trim();
                if (normalized.length > 0) {
                    tags.add(normalized);
                }
            }
        }

        const entry: CacheEntry<V> = {
            value,
            expiresAt,
            createdAt: now,
            lastAccessedAt: now,
            hits: 0,
            tags
        };

        this.store.set(key, entry);
        this.enforceSizeLimit();
        return value;
    }

    get(key: CacheKey): V | undefined {
        const entry = this.lookup(key, { updateRecency: true, incrementHits: true });
        return entry?.value;
    }

    peek(key: CacheKey): V | undefined {
        const entry = this.lookup(key, { updateRecency: false, incrementHits: false });
        return entry?.value;
    }

    has(key: CacheKey): boolean {
        return this.lookup(key, { updateRecency: false, incrementHits: false }) !== undefined;
    }

    async getOrSet(key: CacheKey, factory: () => Promise<V> | V, options?: SetOptions): Promise<V> {
        const existing = this.get(key);
        if (existing !== undefined) {
            return existing;
        }

        const inflight = this.pending.get(key);
        if (inflight) {
            return inflight;
        }

        const promise = (async () => {
            try {
                const produced = await factory();
                this.set(key, produced, options);
                return produced;
            } finally {
                this.pending.delete(key);
            }
        })();

        this.pending.set(key, promise);
        return promise;
    }

    delete(key: CacheKey): boolean {
        const entry = this.store.get(key);
        if (!entry) {
            return false;
        }
        this.store.delete(key);
        this.emitEviction(key, entry, 'manual');
        return true;
    }

    clear(): void {
        if (this.store.size === 0) {
            return;
        }
        for (const [key, entry] of this.store.entries()) {
            this.emitEviction(key, entry, 'cleared');
        }
        this.store.clear();
    }

    pruneExpired(): number {
        if (this.store.size === 0) {
            return 0;
        }
        const now = this.options.timeProvider();
        let removed = 0;
        for (const [key, entry] of this.store.entries()) {
            if (entry.expiresAt !== null && entry.expiresAt <= now) {
                this.store.delete(key);
                this.emitEviction(key, entry, 'expired');
                removed += 1;
            }
        }
        return removed;
    }

    keys(): CacheKey[] {
        this.pruneExpired();
        return Array.from(this.store.keys());
    }

    entries(): Array<[CacheKey, V]> {
        this.pruneExpired();
        return Array.from(this.store.entries(), ([key, entry]) => [key, entry.value]);
    }

    keysByTag(tag: string): CacheKey[] {
        const normalized = tag.trim();
        if (!normalized) {
            return [];
        }
        this.pruneExpired();
        const result: CacheKey[] = [];
        for (const [key, entry] of this.store.entries()) {
            if (entry.tags.has(normalized)) {
                result.push(key);
            }
        }
        return result;
    }

    deleteByTag(tag: string): number {
        const normalized = tag.trim();
        if (!normalized) {
            return 0;
        }
        this.pruneExpired();
        let removed = 0;
        for (const [key, entry] of this.store.entries()) {
            if (entry.tags.has(normalized)) {
                this.store.delete(key);
                this.emitEviction(key, entry, 'tag');
                removed += 1;
            }
        }
        return removed;
    }

    stats(): CacheStats {
        this.pruneExpired();
        return {
            size: this.store.size,
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            evictions: this.metrics.evictions,
            pending: this.pending.size
        };
    }

    private lookup(
        key: CacheKey,
        options: { updateRecency: boolean; incrementHits: boolean }
    ): CacheEntry<V> | undefined {
        const entry = this.store.get(key);
        if (!entry) {
            if (options.incrementHits) {
                this.metrics.misses += 1;
            }
            return undefined;
        }

        const now = this.options.timeProvider();
        if (entry.expiresAt !== null && entry.expiresAt <= now) {
            this.store.delete(key);
            this.emitEviction(key, entry, 'expired');
            if (options.incrementHits) {
                this.metrics.misses += 1;
            }
            return undefined;
        }

        if (options.incrementHits) {
            entry.hits += 1;
            this.metrics.hits += 1;
        }

        if (options.updateRecency) {
            entry.lastAccessedAt = now;
            this.store.delete(key);
            this.store.set(key, entry);
        }

        return entry;
    }

    private enforceSizeLimit(): void {
        const { maxEntries } = this.options;
        if (!maxEntries || maxEntries < 1) {
            return;
        }
        while (this.store.size > maxEntries) {
            const iterator = this.store.entries().next();
            if (iterator.done) {
                break;
            }
            const [evictKey, evictEntry] = iterator.value;
            this.store.delete(evictKey);
            this.emitEviction(evictKey, evictEntry, 'maxSize');
        }
    }

    private emitEviction(key: CacheKey, entry: CacheEntry<V>, reason: EvictionReason): void {
        this.metrics.evictions += 1;
        this.options.onEvict?.({
            key,
            value: entry.value,
            reason,
            metadata: {
                createdAt: entry.createdAt,
                lastAccessedAt: entry.lastAccessedAt,
                expiresAt: entry.expiresAt ?? undefined,
                hits: entry.hits,
                tags: Array.from(entry.tags)
            }
        });
    }
}

export function createMemoryCache<V>(options?: MemoryCacheOptions<V>): MemoryCache<V> {
    return new MemoryCache<V>(options);
}

function normalizeTtl(value: number | null | undefined): number | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    return value < 0 ? 0 : value;
}

function normalizeMaxEntries(value: number | null | undefined): number | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    const normalized = Math.floor(value);
    if (normalized <= 0) {
        return undefined;
    }
    return normalized;
}
