import { readFile } from 'node:fs/promises';
import { UsageError } from '../utils/errors.js';

export async function readFields(path: string): Promise<string[]> {
  let content: string;
  try { content = await readFile(path, 'utf8'); }
  catch (error) { throw new UsageError(`Cannot read fields file '${path}': ${error instanceof Error ? error.message : String(error)}`); }
  const trimmed = content.trim();
  if (!trimmed) return [];
  let fields: unknown;
  if (trimmed.startsWith('[')) {
    try { fields = JSON.parse(trimmed); }
    catch (error) { throw new UsageError(`Invalid JSON array in fields file '${path}': ${error instanceof Error ? error.message : String(error)}`); }
  } else fields = trimmed.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  if (!Array.isArray(fields) || fields.some(field => typeof field !== 'string' || !field.trim())) {
    throw new UsageError(`Fields file '${path}' must contain non-empty JSON paths, one per line or as a JSON string array`);
  }
  return [...new Set(fields.map(field => (field as string).trim()))];
}
