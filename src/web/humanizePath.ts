import { parsePath } from '../compare/pathMatcher.js';

export function humanizeJsonPath(path: string): string {
  if (path === '$' || !path.trim()) return 'Entire JSON document';

  return parsePath(path).map(token => {
    if (/^\d+$/.test(token)) return `Item ${Number(token) + 1} ([${token}])`;
    return humanizeProperty(token);
  }).join(' → ');
}

function humanizeProperty(value: string): string {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!spaced) return value;
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}
