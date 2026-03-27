"use client";

type CacheRecord<T> = {
  timestamp: number;
  value: T;
};

const memoryCache = new Map<string, CacheRecord<unknown>>();

function getStorageKey(key: string) {
  return `safe-streets-cache:${key}`;
}

export function readCachedValue<T>(key: string, maxAgeMs: number): T | null {
  const now = Date.now();
  const inMemory = memoryCache.get(key) as CacheRecord<T> | undefined;

  if (inMemory && now - inMemory.timestamp <= maxAgeMs) {
    return inMemory.value;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getStorageKey(key));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheRecord<T>;
    if (now - parsed.timestamp > maxAgeMs) {
      window.sessionStorage.removeItem(getStorageKey(key));
      return null;
    }

    memoryCache.set(key, parsed as CacheRecord<unknown>);
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeCachedValue<T>(key: string, value: T) {
  const record: CacheRecord<T> = {
    timestamp: Date.now(),
    value,
  };

  memoryCache.set(key, record as CacheRecord<unknown>);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(getStorageKey(key), JSON.stringify(record));
  } catch {
    // Ignore storage quota or serialization failures so UI stays responsive.
  }
}
