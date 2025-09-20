import {
    Lifecycle,
    createModule,
    getContainer,
    registerModules,
    type Container
} from 'cw.api.core.di';
import { MemoryCache, type MemoryCacheOptions } from './memoryCache.js';

export const cacheModule = createModule({
    name: 'cw.api.core.cache.memory',
    providers: [
        {
            useClass: MemoryCache,
            options: {
                lifecycle: Lifecycle.Singleton
            }
        }
    ],
    exports: [MemoryCache]
});

export interface UseCacheOptions<V> {
    container?: Container;
    cacheOptions?: Partial<MemoryCacheOptions<V>>;
    configure?: (cache: MemoryCache<V>) => void;
}

export function useCache<V>(options: UseCacheOptions<V> = {}): MemoryCache<V> {
    const container = options.container ?? getContainer();
    registerModules(container, cacheModule);
    const cache = container.resolve(MemoryCache<V> as unknown as new () => MemoryCache<V>);
    if (options.cacheOptions) {
        cache.configure(options.cacheOptions);
    }
    options.configure?.(cache);
    return cache;
}
