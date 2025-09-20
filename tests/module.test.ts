import { Container, registerModules, resetContainer, getContainer } from 'cw.api.core.di';
import { MemoryCache, cacheModule, useCache } from '../src/index.js';

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
});
