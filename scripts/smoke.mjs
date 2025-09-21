#!/usr/bin/env node
import { MemoryCache, createMemoryCache } from '../dist/index.js';

function fail(message, error) {
  console.error('[cw.api.core.cache.memory] Smoke test failed:', message);
  if (error) {
    console.error(error);
  }
  process.exit(1);
}

try {
  const cache = new MemoryCache();
  cache.set('smoke-key', 42, { tags: ['smoke'] });
  if (cache.get('smoke-key') !== 42) {
    fail('read-after-write returned unexpected value');
  }
  if (!cache.has('smoke-key')) {
    fail('has() should report true for existing key');
  }

  const isolated = createMemoryCache();
  const value = await isolated.getOrSet('async-key', () => 'hello');
  if (value !== 'hello' || isolated.peek('async-key') !== 'hello') {
    fail('getOrSet/peek mismatch');
  }

  isolated.clear();
  if (isolated.size !== 0) {
    fail('clear() should remove all entries');
  }

  console.log('[cw.api.core.cache.memory] OK: smoke test passed');
} catch (error) {
  fail('unexpected error', error);
}
