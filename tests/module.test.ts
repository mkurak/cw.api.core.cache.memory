import { jest } from '@jest/globals';
import { Container, registerModules, resetContainer, getContainer } from 'cw.api.core.di';
import { MemoryCache, cacheModule, useCache, createMemoryCache } from '../src/index.js';

describe('cacheModule', () => {
    afterEach(async () => {
        await resetContainer();
    });

    it('registers MemoryCache as a singleton when module is applied', () => {
        const container = new Container();
        registerModules(container, cacheModule);

        const first = container.resolve(MemoryCache);
        const second = container.resolve(MemoryCache);

        expect(first).toBeInstanceOf(MemoryCache);
        expect(first).toBe(second);
    });

    it('useCache returns the shared instance from the default container', () => {
        const resolved = useCache<string>();
        const container = getContainer();

        expect(resolved).toBeInstanceOf(MemoryCache);
        expect(container.resolve(MemoryCache)).toBe(resolved);
    });

    it('applies cacheOptions when provided to useCache', () => {
        let now = 0;
        const cache = useCache<string>({
            cacheOptions: {
                defaultTtl: 5,
                timeProvider: () => now
            }
        });

        cache.set('ttl', 'value');
        now = 10;

        expect(cache.get('ttl')).toBeUndefined();
    });

    it('ignores subsequent cacheOptions for the shared singleton', () => {
        let now = 0;
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        const cache = useCache<string>({
            cacheOptions: {
                defaultTtl: 5,
                timeProvider: () => now
            }
        });

        const sameCache = useCache<string>({
            cacheOptions: {
                defaultTtl: 100
            }
        });

        expect(sameCache).toBe(cache);

        cache.set('ttl-check', 'value');
        now = 10;
        expect(cache.get('ttl-check')).toBeUndefined();
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it('createMemoryCache produces isolated instances', () => {
        const first = createMemoryCache<string>({ defaultTtl: 1 });
        const second = createMemoryCache<string>();

        expect(first).not.toBe(second);

        first.set('a', '1', { ttl: 0 });
        second.set('a', '2');

        expect(first.get('a')).toBeUndefined();
        expect(second.get('a')).toBe('2');
    });
});
