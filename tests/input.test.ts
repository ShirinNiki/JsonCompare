import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readFields } from '../src/input/readFields.js';
import { readJson } from '../src/input/readJson.js';

describe('input', () => {
  it('reads and deduplicates both fields formats', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'json-compare-'));
    const lines = join(directory, 'lines.txt');
    const array = join(directory, 'array.json');
    await writeFile(lines, 'a\na\n# comment\nb\n');
    await writeFile(array, '["a", "b"]');
    expect(await readFields(lines)).toEqual(['a', 'b']);
    expect(await readFields(array)).toEqual(['a', 'b']);
  });
  it('rejects invalid JSON and invalid fields files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'json-compare-'));
    const json = join(directory, 'bad.json');
    const fields = join(directory, 'fields.json');
    await writeFile(json, '{');
    await writeFile(fields, '[1]');
    await expect(readJson(json)).rejects.toThrow('Invalid JSON');
    await expect(readFields(fields)).rejects.toThrow('must contain');
  });
});
