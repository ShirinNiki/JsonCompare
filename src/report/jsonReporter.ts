import type { ComparisonResult } from '../compare/types.js';

export function jsonReport(result: ComparisonResult): string {
  return JSON.stringify(result, (_key, value: unknown) => value === undefined ? '<missing>' : value, 2);
}
