import { describe, expect, it } from 'vitest';
import { pathMatches } from '../src/compare/pathMatcher.js';

describe('path matcher', () => {
  it('supports dot notation, indexes and array wildcard', () => {
    expect(pathMatches('view.widgets[*].id', 'view.widgets[3].id')).toBe(true);
    expect(pathMatches('content.contests[0].contestKey', 'content.contests[0].contestKey')).toBe(true);
    expect(pathMatches('content.contests[0].contestKey', 'content.contests[1].contestKey')).toBe(false);
  });
  it('supports recursive wildcard', () => {
    expect(pathMatches('**.price', 'view.widgets[0].content.price')).toBe(true);
    expect(pathMatches('**.price', 'price')).toBe(true);
    expect(pathMatches('**.price', 'prices')).toBe(false);
  });
});
