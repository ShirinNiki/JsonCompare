import { readFile } from 'node:fs/promises';
import type { JsonValue } from '../compare/types.js';
import { InputError } from '../utils/errors.js';

export async function readJson(path: string): Promise<JsonValue> {
  let content: string;
  try { content = await readFile(path, 'utf8'); }
  catch (error) { throw new InputError(`Cannot read JSON file '${path}': ${messageOf(error)}`); }
  try { return JSON.parse(content) as JsonValue; }
  catch (error) { throw new InputError(`Invalid JSON in '${path}': ${messageOf(error)}`); }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
