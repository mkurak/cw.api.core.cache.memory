import { jest } from '@jest/globals';
import { MemoryCache, type CacheEviction } from '../src/index.js';

describe('MemoryCache', () => {
    it('stores and retrieves values while tracking hits', () => {
        const cache = new MemoryCache<string>();
        cache.set('token', 'abc');

        expect(cache.get('token')).toBe('abc');
        expect(cache.stats()).toMatchObject({ size: 1, hits: 1, misses: 0, evictions: 0 });
    });

    it('expires entries based on ttl and records misses', () => {
        let current = 0;
        const cache = new MemoryCache<string>({ defaultTtl: 1000, timeProvider: () => current });
        cache.set('session', 'value');

        current = 999;
        expect(cache.get('session')).toBe('value');

        current = 1001;
        expect(cache.get('session')).toBeUndefined();
        expect(cache.stats()).toMatchObject({ size: 0, hits: 1, misses: 1, evictions: 1 });
    });

    it('deduplicates concurrent getOrSet calls', async () => {
        const cache = new MemoryCache<number>();
        const factory = jest
            .fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 5));
                return 42;
            })
            .mockName('factory');

        const [first, second] = await Promise.all([
            cache.getOrSet('answer', factory),
            cache.getOrSet('answer', factory)
        ]);

        expect(first).toBe(42);
        expect(second).toBe(42);
        expect(factory).toHaveBeenCalledTimes(1);
        expect(cache.stats()).toMatchObject({ size: 1, pending: 0 });
    });

    it('returns cached value on subsequent getOrSet calls', async () => {
        const cache = new MemoryCache<number>();
        const factory = jest.fn(async () => 7);

        await cache.getOrSet('memo', factory);
        const value = await cache.getOrSet('memo', factory);

        expect(value).toBe(7);
        expect(factory).toHaveBeenCalledTimes(1);
    });

    it('enforces maxEntries and emits eviction details', () => {
        const evictions: Array<CacheEviction<number>> = [];
        const cache = new MemoryCache<number>({
            maxEntries: 2,
            onEvict: (payload) => evictions.push(payload)
        });

        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);

        expect(cache.has('a')).toBe(false);
        expect(evictions).toHaveLength(1);
        expect(evictions[0]).toMatchObject({ key: 'a', value: 1, reason: 'maxSize' });
    });

    it('treats non-positive maxEntries as unlimited', () => {
        const cache = new MemoryCache<number>({ maxEntries: -5 });
        cache.set('x', 1);
        cache.set('y', 2);
        cache.set('z', 3);

        expect(cache.size).toBe(3);
    });

    it('supports tag-based lookups and invalidations', () => {
        const cache = new MemoryCache<number>();
        cache.set('alpha', 1, { tags: ['user', 'session'] });
        cache.set('beta', 2, { tags: ['user'] });
        cache.set('gamma', 3, { tags: ['system'] });

        expect(cache.keysByTag('user')).toEqual(['alpha', 'beta']);
        expect(cache.deleteByTag('user')).toBe(2);
        expect(cache.size).toBe(1);
        expect(cache.has('gamma')).toBe(true);
    });

    it('returns empty arrays for blank tag lookups', () => {
        const cache = new MemoryCache<number>();
        cache.set('alpha', 1, { tags: ['user'] });

        expect(cache.keysByTag('   ')).toEqual([]);
    });

    it('clears entries and reports eviction count', () => {
        const cache = new MemoryCache<string>();
        cache.set('k1', 'v1');
        cache.set('k2', 'v2');

        cache.clear();

        expect(cache.size).toBe(0);
        expect(cache.stats()).toMatchObject({ evictions: 2 });
    });

    it('no-ops when clearing an empty cache', () => {
        const cache = new MemoryCache<string>();
        cache.clear();

        expect(cache.stats()).toMatchObject({ evictions: 0, size: 0 });
    });

    it('peeks without mutating hit counters or recency', () => {
        const cache = new MemoryCache<string>();
        cache.set('shadow', 'value');

        expect(cache.peek('shadow')).toBe('value');
        expect(cache.stats()).toMatchObject({ hits: 0, misses: 0 });
    });

    it('removes entries manually and emits manual eviction', () => {
        const handler = jest.fn();
        const cache = new MemoryCache<string>({ onEvict: handler });
        cache.set('manual', 'value');

        expect(cache.delete('manual')).toBe(true);
        expect(cache.delete('manual')).toBe(false);
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'manual', reason: 'manual', value: 'value' })
        );
        expect(cache.stats()).toMatchObject({ evictions: 1 });
    });

    it('normalises negative ttl values to expire immediately', () => {
        let now = 10;
        const cache = new MemoryCache<string>({ defaultTtl: -50, timeProvider: () => now });
        cache.set('temp', 'value');

        now = 11;
        expect(cache.get('temp')).toBeUndefined();
        expect(cache.stats()).toMatchObject({ evictions: 1, misses: 1 });
    });

    it('prunes expired entries eagerly', () => {
        let now = 0;
        const cache = new MemoryCache<string>({ timeProvider: () => now });
        cache.set('short', 'value', { ttl: 5 });

        now = 10;
        expect(cache.pruneExpired()).toBe(1);
        expect(cache.stats()).toMatchObject({ size: 0, evictions: 1 });
    });

    it('ignores blank tags when deleting by tag', () => {
        const cache = new MemoryCache<string>();
        cache.set('foo', 'bar');

        expect(cache.deleteByTag('   ')).toBe(0);
        expect(cache.stats()).toMatchObject({ hits: 0, misses: 0, evictions: 0 });
    });

    it('updates defaults via configure()', () => {
        let now = 0;
        const evictions: Array<CacheEviction<string>> = [];
        const cache = new MemoryCache<string>({ timeProvider: () => now });

        cache.configure({ defaultTtl: 5, onEvict: (payload) => evictions.push(payload) });
        cache.set('configurable', 'value');

        now = 10;
        expect(cache.get('configurable')).toBeUndefined();
        expect(evictions).toHaveLength(1);

        cache.configure({ maxEntries: 1 });
        cache.set('a', '1');
        cache.set('b', '2');
        expect(cache.has('a')).toBe(false);
    });
});
