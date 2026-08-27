import { describe, expect, it } from 'vitest';
import { alignJsonLines, prettyJsonLines } from '../src/web/lineDiff.js';

describe('lineDiff', () => {
  it('pretty-prints JSON before comparing it', () => {
    expect(prettyJsonLines({ active: true })).toEqual(['{', '  "active": true', '}']);
  });

  it('aligns a changed line on both sides', () => {
    const rows = alignJsonLines(['{', '  "name": "old"', '}'], ['{', '  "name": "new"', '}']);
    expect(rows).toEqual([
      { leftNumber: 1, left: '{', rightNumber: 1, right: '{', kind: 'equal' },
      { leftNumber: 2, left: '  "name": "old"', rightNumber: 2, right: '  "name": "new"', kind: 'changed' },
      { leftNumber: 3, left: '}', rightNumber: 3, right: '}', kind: 'equal' },
    ]);
  });

  it('leaves a gap opposite an added line', () => {
    const rows = alignJsonLines(['{', '}'], ['{', '  "added": true', '}']);
    expect(rows[1]).toEqual({ rightNumber: 2, right: '  "added": true', kind: 'added' });
  });
});
