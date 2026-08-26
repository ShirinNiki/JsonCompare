import { describe, expect, it } from 'vitest';
import { compareJson } from '../src/compare/comparator.js';

describe('comparator', () => {
  it('reports equal documents', () => expect(compareJson({ a: 1 }, { a: 1 }).equal).toBe(true));
  it('reports a changed primitive', () => expect(compareJson({ a: 1 }, { a: 2 }).differences[0]?.type).toBe('changed'));
  it('reports fields missing on either side', () => {
    expect(compareJson({}, { a: 1 }).differences[0]?.type).toBe('missing-in-local');
    expect(compareJson({ a: 1 }, {}).differences[0]?.type).toBe('missing-in-uat');
  });
  it('reports array additions and removals', () => {
    expect(compareJson({ a: [1] }, { a: [1, 2] }).differences[0]?.type).toBe('added');
    expect(compareJson({ a: [1, 2] }, { a: [1] }).differences[0]?.type).toBe('removed');
  });
  it('reports pure array reordering', () => expect(compareJson({ a: [1, 2] }, { a: [2, 1] }).differences[0]?.type).toBe('array-order-mismatch'));
  it('matches configured arrays by key', () => {
    const result = compareJson(
      { contests: [{ id: 1, name: 'one' }, { id: 2, name: 'two' }] },
      { contests: [{ id: 2, name: 'TWO' }, { id: 1, name: 'one' }] },
      { arrayKeys: [{ path: '**.contests', key: 'id' }] },
    );
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]?.path).toBe('contests[1].name');
  });
  it('reports duplicate and missing array keys', () => {
    const result = compareJson({ a: [{ id: 1 }, { id: 1 }, {}] }, { a: [] }, { arrayKeys: [{ path: 'a', key: 'id' }] });
    expect(result.differences.map(item => item.type)).toContain('duplicate-array-key');
    expect(result.differences.map(item => item.type)).toContain('missing-array-key');
  });
  it('compares only selected wildcard fields and still reports missing fields', () => {
    const result = compareJson(
      { widgets: [{ id: 1, ignored: 'a' }] }, { widgets: [{ ignored: 'b' }] },
      { fields: ['widgets[*].id'] },
    );
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]?.type).toBe('missing-in-uat');
  });
  it('applies ignore rules after selection', () => {
    const result = compareJson({ a: { price: 1, name: 'a' } }, { a: { price: 2, name: 'b' } }, { ignoreFields: ['**.price'] });
    expect(result.differences.map(item => item.path)).toEqual(['a.name']);
  });
  it('ignores configured time leaves but not their parents', () => {
    const result = compareJson(
      { clock: { timestamp: 1, status: 'on' } }, { clock: { timestamp: 2, status: 'off' } },
      { ignoreTime: true, timeFields: ['timestamp'] },
    );
    expect(result.differences.map(item => item.path)).toEqual(['clock.status']);
  });
  it('reports type mismatch', () => expect(compareJson({ a: 1 }, { a: '1' }).differences[0]?.type).toBe('type-mismatch'));
});
