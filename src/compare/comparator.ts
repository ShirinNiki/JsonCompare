import { arrayKeyForPath, sameArrayMembers, stableSerialize } from './arrayMatcher.js';
import { appendPath, getAtPath, matchingConcretePaths, parsePath, pathMatches } from './pathMatcher.js';
import type { CompareOptions, ComparisonResult, Difference, DifferenceType, JsonValue } from './types.js';

const MISSING = Symbol('missing');
type MaybeValue = JsonValue | typeof MISSING;

export function jsonType(value: MaybeValue): string {
  if (value === MISSING) return 'missing';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

export function compareJson(local: JsonValue, uat: JsonValue, rawOptions: CompareOptions = {}): ComparisonResult {
  const options: CompareOptions = {
    fields: [...new Set(rawOptions.fields ?? [])],
    ignoreFields: [...new Set(rawOptions.ignoreFields ?? [])],
    ignoreTime: rawOptions.ignoreTime ?? false,
    keysOnly: rawOptions.keysOnly ?? false,
    timeFields: [...new Set(rawOptions.timeFields ?? [])],
    arrayKeys: dedupeArrayKeys(rawOptions.arrayKeys ?? []),
  };
  const differences: Difference[] = [];
  const emitted = new Set<string>();

  function ignored(path: string): boolean {
    if (options.ignoreFields!.some(pattern => pathMatches(pattern, path))) return true;
    if (!options.ignoreTime) return false;
    const lastToken = parsePath(path).at(-1);
    return lastToken !== undefined && options.timeFields!.includes(lastToken);
  }

  function add(path: string, left: MaybeValue, right: MaybeValue, type: DifferenceType, reason?: string): void {
    if (ignored(path)) return;
    const signature = `${path}\0${type}\0${reason ?? ''}`;
    if (emitted.has(signature)) return;
    emitted.add(signature);
    differences.push({
      path: path || '$',
      local: left === MISSING ? undefined : left,
      uat: right === MISSING ? undefined : right,
      type,
      localType: jsonType(left),
      uatType: jsonType(right),
      ...(reason ? { reason } : {}),
    });
  }

  function compare(left: MaybeValue, right: MaybeValue, path: string): void {
    if (path && ignored(path)) return;
    if (left === MISSING) { add(path, left, right, pathHasArrayIndex(path) ? 'added' : 'missing-in-local'); return; }
    if (right === MISSING) { add(path, left, right, pathHasArrayIndex(path) ? 'removed' : 'missing-in-uat'); return; }
    if (options.keysOnly) { compareKeys(left, right, path); return; }
    const leftType = jsonType(left);
    const rightType = jsonType(right);
    if (leftType !== rightType) { add(path, left, right, 'type-mismatch'); return; }
    if (Array.isArray(left) && Array.isArray(right)) { compareArrays(left, right, path); return; }
    if (left !== null && right !== null && typeof left === 'object' && typeof right === 'object') {
      const leftObject = left as Record<string, JsonValue>;
      const rightObject = right as Record<string, JsonValue>;
      const keys = new Set([...Object.keys(leftObject), ...Object.keys(rightObject)]);
      for (const key of [...keys].sort()) {
        compare(
          Object.prototype.hasOwnProperty.call(leftObject, key) ? leftObject[key]! : MISSING,
          Object.prototype.hasOwnProperty.call(rightObject, key) ? rightObject[key]! : MISSING,
          appendPath(path, key),
        );
      }
      return;
    }
    if (!Object.is(left, right)) add(path, left, right, 'changed');
  }

  function compareKeys(left: JsonValue, right: JsonValue, path: string): void {
    if (Array.isArray(left) && Array.isArray(right)) {
      const sharedLength = Math.min(left.length, right.length);
      for (let index = 0; index < sharedLength; index += 1) compare(left[index]!, right[index]!, appendPath(path, index));
      return;
    }
    const leftObject = jsonObject(left);
    const rightObject = jsonObject(right);
    if (!leftObject && !rightObject) return;
    const keys = new Set([...Object.keys(leftObject ?? {}), ...Object.keys(rightObject ?? {})]);
    for (const key of [...keys].sort()) {
      compare(
        leftObject && Object.prototype.hasOwnProperty.call(leftObject, key) ? leftObject[key]! : MISSING,
        rightObject && Object.prototype.hasOwnProperty.call(rightObject, key) ? rightObject[key]! : MISSING,
        appendPath(path, key),
      );
    }
  }

  function compareArrays(left: JsonValue[], right: JsonValue[], path: string): void {
    const key = arrayKeyForPath(path, options);
    if (key) { compareKeyedArrays(left, right, path, key); return; }
    if (sameArrayMembers(left, right) && stableSerialize(left) !== stableSerialize(right)) {
      add(path, left, right, 'array-order-mismatch', 'Array items are equal but their order differs');
      return;
    }
    const maximum = Math.max(left.length, right.length);
    for (let index = 0; index < maximum; index += 1) {
      compare(index < left.length ? left[index]! : MISSING, index < right.length ? right[index]! : MISSING, appendPath(path, index));
    }
  }

  function compareKeyedArrays(left: JsonValue[], right: JsonValue[], path: string, key: string): void {
    const local = indexByKey(left, key, 'Local', path, add);
    const target = indexByKey(right, key, 'UAT', path, add);
    const keys = new Set([...local.values.keys(), ...target.values.keys()]);
    for (const serializedKey of keys) {
      if (local.ambiguous.has(serializedKey) || target.ambiguous.has(serializedKey)) continue;
      const localEntry = local.values.get(serializedKey);
      const targetEntry = target.values.get(serializedKey);
      const itemPath = appendPath(path, localEntry?.index ?? targetEntry!.index);
      if (!localEntry) add(itemPath, MISSING, targetEntry!.value, 'added', `No Local item with ${key}=${serializedKey}`);
      else if (!targetEntry) add(itemPath, localEntry.value, MISSING, 'removed', `No UAT item with ${key}=${serializedKey}`);
      else compare(localEntry.value, targetEntry.value, itemPath);
    }
  }

  const selected = options.fields!.length ? matchingConcretePaths(options.fields!, local, uat) : [];
  if (options.fields!.length) {
    for (const path of selected) {
      const left = getAtPath(local, path);
      const right = getAtPath(uat, path);
      compare(left.exists ? left.value! : MISSING, right.exists ? right.value! : MISSING, path);
    }
  } else compare(local, uat, '');

  differences.sort((a, b) => a.path.localeCompare(b.path) || a.type.localeCompare(b.type));
  const summary = {
    equal: differences.length === 0,
    totalDifferences: differences.length,
    valuesChanged: differences.filter(item => item.type === 'changed' || item.type === 'array-order-mismatch').length,
    missingFields: differences.filter(item => item.type === 'missing-in-local' || item.type === 'missing-in-uat' || item.type === 'missing-array-key').length,
    itemsAdded: differences.filter(item => item.type === 'added').length,
    itemsRemoved: differences.filter(item => item.type === 'removed').length,
    typeMismatches: differences.filter(item => item.type === 'type-mismatch').length,
  };
  return {
    equal: summary.equal,
    summary,
    differences,
    settings: {
      fields: options.fields!, ignoreFields: options.ignoreFields!, ignoreTime: options.ignoreTime!, keysOnly: options.keysOnly!,
      timeFields: options.timeFields!, arrayKeys: options.arrayKeys!,
    },
  };
}

function jsonObject(value: JsonValue): Record<string, JsonValue> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

function pathHasArrayIndex(path: string): boolean {
  return /\[\d+\]$/.test(path);
}

function dedupeArrayKeys(rules: Array<{ path: string; key: string }>): Array<{ path: string; key: string }> {
  const seen = new Set<string>();
  return rules.filter(rule => {
    const signature = `${rule.path}\0${rule.key}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function indexByKey(
  values: JsonValue[], key: string, side: 'Local' | 'UAT', path: string,
  add: (path: string, left: MaybeValue, right: MaybeValue, type: DifferenceType, reason?: string) => void,
): { values: Map<string, { value: JsonValue; index: number }>; ambiguous: Set<string> } {
  const indexed = new Map<string, { value: JsonValue; index: number }>();
  const ambiguous = new Set<string>();
  values.forEach((value, index) => {
    const itemPath = appendPath(path, index);
    if (value === null || typeof value !== 'object' || Array.isArray(value) || !Object.prototype.hasOwnProperty.call(value, key)) {
      add(itemPath, side === 'Local' ? value : MISSING, side === 'UAT' ? value : MISSING, 'missing-array-key', `${side} array item has no '${key}' key`);
      return;
    }
    const keyValue = value[key]!;
    const serialized = stableSerialize(keyValue);
    if (indexed.has(serialized)) {
      ambiguous.add(serialized);
      add(itemPath, side === 'Local' ? value : MISSING, side === 'UAT' ? value : MISSING, 'duplicate-array-key', `${side} array contains duplicate ${key}=${serialized}`);
    } else indexed.set(serialized, { value, index });
  });
  return { values: indexed, ambiguous };
}
