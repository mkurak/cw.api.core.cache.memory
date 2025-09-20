# Developer Notes — cw.api.core.cache.memory

> Bu dosya, hafızada çalışan cache katmanını hatırlamak ve gelecekteki oturumlarda
> hızlıca bağlama girmek için oluşturuldu.

## Genel Bakış
- `MemoryCache` sınıfı tek giriş noktasıdır; TTL, maksimum kayıt sınırı, tag
  tabanlı invalidasyon ve eşzamanlı `getOrSet` desteği sunar.
- Hiçbir runtime bağımlılığı yoktur; Node.js >= 18 ve TypeScript hedeflenir.
- ESM çıktısı `dist/` dizininde `npm run build` komutuyla üretilir.

## Tasarım Notları
- **Depolama**: `Map<string, CacheEntry<V>>` yapısı kullanılır. `entries()` ve
  `keys()` çağrıları önce `pruneExpired()` ile süresi dolan kayıtları temizler.
- **TTL**: Varsayılan `defaultTtl` opsiyoneldir; `set` çağrısındaki `ttl`
  parametresi ile override edilebilir. TTL (ms) 0 veya negatif gelirse kayıt
  hemen süresi dolmuş kabul edilir.
- **Sıralama**: `get` çağrıları kayıtları yeniden ekleyerek ekleme sırasını
  günceller; böylece `maxEntries` uygulandığında FIFO benzeri davranış elde
  edilir ve en eski kayıtlar atılır.
- **Eşzamanlılık**: `getOrSet` fonksiyonu aynı anahtar için eşzamanlı fabrikaları
  tek promiste birleştirir (`pending` haritası). Fabrika hata verirse kayıt
  yazılmaz ve hatanın kendisi döner.
- **Tag desteği**: `set` ile gelen `tags` alanı normalleştirilir (trim + unique).
  `keysByTag` / `deleteByTag` işlemleri bu set üzerinden çalışır.
- **Gözlemlenebilirlik**: `stats()` hits/misses/evictions/pending değerlerini
  döner. `onEvict` callback'i sebep (`expired`, `maxSize`, `manual`, `cleared`,
  `tag`) ve meta bilgileri ile çağrılır.

## Testler
- `tests/index.test.ts` dosyası TTL hatları, `getOrSet` eşzamanlılığı,
  `maxEntries` davranışı ve tag invalidasyonu dahil temel davranışları kapsar.
- TTL senaryoları kontrol edilebilir bir saat için `timeProvider` kullanır.
- Jest globali ESM modunda kullanıldığı için testlerde `import { jest } from
  '@jest/globals'` yapılır.

## Scriptler
- `npm run build` – TypeScript derlemesi (`tsconfig.build.json`).
- `npm run lint` – ESLint flat config hedefi.
- `npm run test` / `npm run test:coverage` – Jest (`--experimental-vm-modules`).
- `npm run hooks:install` – `.githooks` yolunu yapılandırır.
- `npm run release -- <type>` – sürüm artışı + tag + push (otomatik).

## Gelecek Fikirler
- LRU davranışı için `lastAccessedAt` değerine göre daha akıllı boşaltma.
- `observe(key)` benzeri bir API ile reactive kullanım.
- Serileştirilebilir snapshot export/import desteği.
- Promiselerin süresini sınırlandırmak için `getOrSet` tarafında timeout
  seçenekleri.

Bu notları her önemli değişiklikte güncel tutmayı unutma.
