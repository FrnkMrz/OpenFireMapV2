import { beforeEach, afterEach, vi } from 'vitest';

export const blockFetch = (input) => {
  const url = typeof input === 'string'
    ? input
    : (input?.url || input?.href || String(input));
  throw new Error(`Unmocked fetch in unit test: ${url}`);
};

// Initial blockieren
globalThis.fetch = vi.fn(blockFetch);

beforeEach(() => {
  globalThis.fetch = vi.fn(blockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = vi.fn(blockFetch);
});
