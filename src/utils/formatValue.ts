import type { JsonValue } from '../compare/types.js';

export function fullValue(value: JsonValue | undefined): string {
  if (value === undefined) return '<missing>';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export function consoleValue(value: JsonValue | undefined, maximum = 48): string {
  const rendered = fullValue(value).replace(/\s+/g, ' ');
  return rendered.length > maximum ? `${rendered.slice(0, maximum - 1)}…` : rendered;
}

export function markdownEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}
