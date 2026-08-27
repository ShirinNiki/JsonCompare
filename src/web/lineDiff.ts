import type { JsonValue } from '../compare/types.js';

export type LineDiffKind = 'equal' | 'changed' | 'removed' | 'added';

export interface AlignedDiffLine {
  leftNumber?: number;
  left?: string;
  rightNumber?: number;
  right?: string;
  kind: LineDiffKind;
}

export function prettyJsonLines(value: JsonValue): string[] {
  return JSON.stringify(value, null, 2).split('\n');
}

export function alignJsonLines(left: string[], right: string[]): AlignedDiffLine[] {
  if ((left.length + 1) * (right.length + 1) > 5_000_000) return alignByPosition(left, right);

  const lcs = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));
  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      lcs[leftIndex]![rightIndex] = left[leftIndex] === right[rightIndex]
        ? lcs[leftIndex + 1]![rightIndex + 1]! + 1
        : Math.max(lcs[leftIndex + 1]![rightIndex]!, lcs[leftIndex]![rightIndex + 1]!);
    }
  }

  const rows: AlignedDiffLine[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length || rightIndex < right.length) {
    if (leftIndex < left.length && rightIndex < right.length && left[leftIndex] === right[rightIndex]) {
      rows.push({ leftNumber: leftIndex + 1, left: left[leftIndex], rightNumber: rightIndex + 1, right: right[rightIndex], kind: 'equal' });
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    const removed: Array<{ number: number; line: string }> = [];
    const added: Array<{ number: number; line: string }> = [];
    while (leftIndex < left.length || rightIndex < right.length) {
      if (leftIndex < left.length && rightIndex < right.length && left[leftIndex] === right[rightIndex]) break;
      if (rightIndex >= right.length || (leftIndex < left.length && lcs[leftIndex + 1]![rightIndex]! >= lcs[leftIndex]![rightIndex + 1]!)) {
        removed.push({ number: leftIndex + 1, line: left[leftIndex]! });
        leftIndex += 1;
      } else {
        added.push({ number: rightIndex + 1, line: right[rightIndex]! });
        rightIndex += 1;
      }
    }
    const length = Math.max(removed.length, added.length);
    for (let index = 0; index < length; index += 1) {
      const oldLine = removed[index];
      const newLine = added[index];
      rows.push({
        ...(oldLine ? { leftNumber: oldLine.number, left: oldLine.line } : {}),
        ...(newLine ? { rightNumber: newLine.number, right: newLine.line } : {}),
        kind: oldLine && newLine ? 'changed' : oldLine ? 'removed' : 'added',
      });
    }
  }
  return rows;
}

function alignByPosition(left: string[], right: string[]): AlignedDiffLine[] {
  return Array.from({ length: Math.max(left.length, right.length) }, (_, index) => {
    const oldLine = left[index];
    const newLine = right[index];
    return {
      ...(oldLine !== undefined ? { leftNumber: index + 1, left: oldLine } : {}),
      ...(newLine !== undefined ? { rightNumber: index + 1, right: newLine } : {}),
      kind: oldLine === newLine ? 'equal' : oldLine === undefined ? 'added' : newLine === undefined ? 'removed' : 'changed',
    };
  });
}
