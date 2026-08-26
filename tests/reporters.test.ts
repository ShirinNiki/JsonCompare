import { describe, expect, it } from 'vitest';
import { compareJson } from '../src/compare/comparator.js';
import { consoleReport } from '../src/report/consoleReporter.js';
import { jsonReport } from '../src/report/jsonReporter.js';
import { markdownReport } from '../src/report/markdownReporter.js';

describe('reporters', () => {
  const result = compareJson({ a: 1 }, { a: 2 });
  it('uses exact console column names', () => expect(consoleReport(result)).toContain('Path | Local | UAT | Difference'));
  it('emits parseable JSON', () => expect(JSON.parse(jsonReport(result)).summary.totalDifferences).toBe(1));
  it('emits a complete markdown table', () => {
    const report = markdownReport(result);
    expect(report).toContain('## Summary');
    expect(report).toContain('| Path | Local | UAT | Difference |');
  });
});
