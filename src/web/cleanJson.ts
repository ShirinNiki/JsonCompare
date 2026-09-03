const namedEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

/** Repairs common formatting artifacts introduced when JSON is copied from HTML or Markdown. */
export function cleanJsonInput(value: string): string {
  let cleaned = value.replace(/^\uFEFF/, '').trim();

  const fenced = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1] !== undefined) cleaned = fenced[1];

  cleaned = cleaned.replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (entity, hex: string | undefined, decimal: string | undefined) => {
    const codePoint = Number.parseInt(hex ?? decimal ?? '', hex === undefined ? 10 : 16);
    return Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity;
  });
  cleaned = cleaned.replace(/&(amp|apos|gt|lt|nbsp|quot);/gi, (entity, name: string) => namedEntities[name.toLowerCase()] ?? entity);

  // Some Markdown exporters turn keys such as "_typ" into "\\\_typ".
  cleaned = cleaned.replace(/"\\+(_[^"\\]*)"\s*:/g, '"$1":');

  return cleaned.trim();
}

/** Cleans pasted artifacts and pretty-prints the result whenever it is valid JSON. */
export function cleanAndPrettifyJsonInput(value: string): string {
  const cleaned = cleanJsonInput(value);
  try {
    return JSON.stringify(JSON.parse(cleaned) as unknown, null, 2);
  } catch {
    return cleaned;
  }
}
