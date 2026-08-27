import { parsePath } from '../compare/pathMatcher.js';
import type { JsonValue } from '../compare/types.js';

export interface ObjectContext {
  key: string;
  value: JsonValue;
}

export function objectContextForPath(root: JsonValue, path: string): ObjectContext | undefined {
  let current: JsonValue | undefined = root;
  let nearestObject: ObjectContext | undefined;
  let nearestArrayItem: ObjectContext | undefined;

  for (const token of parsePath(path)) {
    if (isJsonObject(current)) nearestObject = firstField(current) ?? nearestObject;

    if (Array.isArray(current) && /^\d+$/.test(token)) {
      current = current[Number(token)];
      if (isJsonObject(current)) nearestArrayItem = firstField(current) ?? nearestArrayItem;
    } else if (isJsonObject(current)) {
      current = current[token];
    } else {
      current = undefined;
      break;
    }
  }

  if (isJsonObject(current)) nearestObject = firstField(current) ?? nearestObject;
  return nearestArrayItem ?? nearestObject;
}

function isJsonObject(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function firstField(value: { [key: string]: JsonValue }): ObjectContext | undefined {
  const entry = Object.entries(value)[0];
  return entry ? { key: entry[0], value: entry[1] } : undefined;
}
