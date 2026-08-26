import type { ComparisonResult } from '../compare/types.js';
import { fullValue, markdownEscape } from '../utils/formatValue.js';

export function markdownReport(result: ComparisonResult): string {
  const { summary, settings } = result;
  const lines = [
    '# JSON Comparison Report', '',
    `**Result:** ${result.equal ? 'EQUAL' : 'DIFFERENT'}`, '',
    '## Summary', '',
    '| Metric | Count |', '|---|---:|',
    `| Total differences | ${summary.totalDifferences} |`,
    `| Values changed | ${summary.valuesChanged} |`,
    `| Missing fields | ${summary.missingFields} |`,
    `| Items added | ${summary.itemsAdded} |`,
    `| Items removed | ${summary.itemsRemoved} |`,
    `| Type mismatches | ${summary.typeMismatches} |`, '',
    '## Settings', '',
    '```json', JSON.stringify(settings, null, 2), '```', '',
    '## Differences', '',
  ];
  if (!result.differences.length) lines.push('No differences found.');
  else {
    lines.push('| Path | Local | UAT | Difference | Local type | UAT type | Reason |', '|---|---|---|---|---|---|---|');
    for (const item of result.differences) {
      lines.push(`| ${markdownEscape(item.path)} | ${markdownEscape(fullValue(item.local))} | ${markdownEscape(fullValue(item.uat))} | ${item.type} | ${item.localType} | ${item.uatType} | ${markdownEscape(item.reason ?? '')} |`);
    }
  }
  return lines.join('\n');
}
