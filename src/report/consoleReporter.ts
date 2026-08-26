import type { ComparisonResult } from '../compare/types.js';
import { consoleValue } from '../utils/formatValue.js';

export function consoleReport(result: ComparisonResult): string {
  const { summary } = result;
  const lines = [
    `Result: ${result.equal ? 'EQUAL' : 'DIFFERENT'}`,
    `Differences: ${summary.totalDifferences} | Changed: ${summary.valuesChanged} | Missing fields: ${summary.missingFields} | Added: ${summary.itemsAdded} | Removed: ${summary.itemsRemoved} | Type mismatches: ${summary.typeMismatches}`,
  ];
  if (!result.differences.length) return lines.join('\n');
  const rows = result.differences.map(item => [item.path, consoleValue(item.local), consoleValue(item.uat), item.type]);
  const headers = ['Path', 'Local', 'UAT', 'Difference'];
  const widths = headers.map((header, column) => Math.min(60, Math.max(header.length, ...rows.map(row => row[column]!.length))));
  const renderRow = (row: string[]): string => row.map((cell, index) => truncate(cell, widths[index]!).padEnd(widths[index]!)).join(' | ');
  lines.push('', renderRow(headers), widths.map(width => '-'.repeat(width)).join('-|-'));
  rows.forEach(row => lines.push(renderRow(row)));
  return lines.join('\n');
}

function truncate(value: string, width: number): string {
  return value.length > width ? `${value.slice(0, width - 1)}…` : value;
}
