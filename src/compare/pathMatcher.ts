import type { JsonValue } from './types.js';

export type PathToken = string | number;

export function parsePath(path: string): string[] {
  if (!path.trim()) return [];
  const tokens: string[] = [];
  const matcher = /([^.[\]]+)|\[([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(path)) !== null) {
    const token = match[1] ?? match[2];
    if (token !== undefined && token !== '') tokens.push(token);
  }
  return tokens;
}

export function pathMatches(pattern: string, concretePath: string): boolean {
  const patternTokens = parsePath(pattern);
  const pathTokens = parsePath(concretePath);
  const memo = new Map<string, boolean>();

  function matches(pi: number, ti: number): boolean {
    const cacheKey = `${pi}:${ti}`;
    const cached = memo.get(cacheKey);
    if (cached !== undefined) return cached;
    let result: boolean;
    if (pi === patternTokens.length) result = ti === pathTokens.length;
    else if (patternTokens[pi] === '**') {
      result = matches(pi + 1, ti) || (ti < pathTokens.length && matches(pi, ti + 1));
    } else {
      result = ti < pathTokens.length
        && (patternTokens[pi] === '*' || patternTokens[pi] === pathTokens[ti])
        && matches(pi + 1, ti + 1);
    }
    memo.set(cacheKey, result);
    return result;
  }
  return matches(0, 0);
}

export function appendPath(base: string, part: string | number): string {
  if (typeof part === 'number') return `${base}[${part}]`;
  return base ? `${base}.${part}` : part;
}

export function collectPaths(value: JsonValue): string[] {
  const paths: string[] = [];
  function visit(current: JsonValue, path: string): void {
    if (path) paths.push(path);
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, appendPath(path, index)));
    } else if (current !== null && typeof current === 'object') {
      Object.entries(current).forEach(([key, child]) => visit(child, appendPath(path, key)));
    }
  }
  visit(value, '');
  return paths;
}

export function getAtPath(root: JsonValue, path: string): { exists: boolean; value?: JsonValue } {
  let current: JsonValue | undefined = root;
  for (const token of parsePath(path)) {
    if (Array.isArray(current) && /^\d+$/.test(token)) {
      const index = Number(token);
      if (!(index in current)) return { exists: false };
      current = current[index];
    } else if (current !== null && typeof current === 'object' && !Array.isArray(current)) {
      if (!Object.prototype.hasOwnProperty.call(current, token)) return { exists: false };
      current = current[token];
    } else return { exists: false };
  }
  return { exists: true, value: current };
}

export function matchingConcretePaths(patterns: string[], ...values: JsonValue[]): string[] {
  const allPaths = new Set(values.flatMap(collectPaths));
  const selected = [...allPaths].filter(path => patterns.some(pattern => pathMatches(pattern, path)));
  selected.sort((a, b) => parsePath(a).length - parsePath(b).length || a.localeCompare(b));
  return selected.filter((path, index) => !selected.slice(0, index).some(parent => {
    const prefix = path.startsWith(`${parent}.`) || path.startsWith(`${parent}[`);
    return prefix;
  }));
}
