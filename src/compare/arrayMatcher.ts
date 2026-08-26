import { pathMatches } from './pathMatcher.js';
import type { CompareOptions, JsonValue } from './types.js';

export function arrayKeyForPath(path: string, options: CompareOptions): string | undefined {
  return options.arrayKeys?.find(rule => pathMatches(rule.path, path))?.key;
}

export function stableSerialize(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key]!)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sameArrayMembers(left: JsonValue[], right: JsonValue[]): boolean {
  if (left.length !== right.length) return false;
  const counts = new Map<string, number>();
  left.forEach(item => {
    const serialized = stableSerialize(item);
    counts.set(serialized, (counts.get(serialized) ?? 0) + 1);
  });
  for (const item of right) {
    const serialized = stableSerialize(item);
    const count = counts.get(serialized) ?? 0;
    if (count === 0) return false;
    counts.set(serialized, count - 1);
  }
  return true;
}
