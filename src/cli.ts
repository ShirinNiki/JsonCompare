#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command, CommanderError, Option } from 'commander';
import { compareJson } from './compare/comparator.js';
import type { CompareOptions } from './compare/types.js';
import { timeFields } from './config/timeFields.js';
import { readFields } from './input/readFields.js';
import { readJson } from './input/readJson.js';
import { consoleReport } from './report/consoleReporter.js';
import { jsonReport } from './report/jsonReporter.js';
import { markdownReport } from './report/markdownReporter.js';
import { UsageError } from './utils/errors.js';

type Format = 'console' | 'json' | 'markdown';
interface CliOptions {
  field: string[];
  fieldsFile?: string;
  ignoreField: string[];
  ignoreFieldsFile?: string;
  ignoreTime: boolean;
  keysOnly: boolean;
  arrayKey: string[];
  output?: string;
  format: Format;
}

function collect(value: string, previous: string[]): string[] { return [...previous, value]; }

export async function run(argv: string[]): Promise<number> {
  const program = new Command();
  program
    .name('compare')
    .description('Deeply compare two JSON API response files')
    .argument('<local.json>', 'Local environment JSON file')
    .argument('<uat.json>', 'UAT/integration environment JSON file')
    .option('--field <json-path>', 'Compare only this path (repeatable)', collect, [])
    .option('--fields-file <path>', 'Read selected paths from a line list or JSON array')
    .option('--ignore-field <json-path>', 'Ignore this path after selection (repeatable)', collect, [])
    .option('--ignore-fields-file <path>', 'Read ignored paths from a line list or JSON array')
    .option('--ignore-time', 'Ignore configured time fields', false)
    .option('--keys-only', 'Compare object-key availability and ignore values', false)
    .option('--array-key <path=key>', 'Match an array by a unique item key (repeatable)', collect, [])
    .option('--output <path>', 'Write the report to a file')
    .addOption(new Option('--format <format>', 'Report format').choices(['console', 'json', 'markdown']).default('console'))
    .exitOverride();
  try {
    await program.parseAsync(argv, { from: 'user' });
    const [localPath, uatPath] = program.processedArgs as [string, string];
    const cli = program.opts<CliOptions>();
    const selectedFromFile = cli.fieldsFile ? await readFields(cli.fieldsFile) : [];
    const ignoredFromFile = cli.ignoreFieldsFile ? await readFields(cli.ignoreFieldsFile) : [];
    const options: CompareOptions = {
      fields: [...new Set([...cli.field, ...selectedFromFile])],
      ignoreFields: [...new Set([...cli.ignoreField, ...ignoredFromFile])],
      ignoreTime: cli.ignoreTime,
      keysOnly: cli.keysOnly,
      timeFields,
      arrayKeys: cli.arrayKey.map(parseArrayKey),
    };
    const [local, uat] = await Promise.all([readJson(localPath), readJson(uatPath)]);
    const result = compareJson(local, uat, options);
    const report = cli.format === 'json' ? jsonReport(result) : cli.format === 'markdown' ? markdownReport(result) : consoleReport(result);
    if (cli.output) await writeFile(cli.output, `${report}\n`, 'utf8');
    else process.stdout.write(`${report}\n`);
    return result.equal ? 0 : 1;
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.exitCode === 0) return 0;
      process.stderr.write(`${error.message}\n`);
      return 2;
    }
    const exitCode = error instanceof Error && 'exitCode' in error ? Number(error.exitCode) : 3;
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    return exitCode;
  }
}

function parseArrayKey(value: string): { path: string; key: string } {
  const separator = value.lastIndexOf('=');
  if (separator <= 0 || separator === value.length - 1) throw new UsageError(`Invalid --array-key '${value}'. Expected <json-path>=<key>`);
  return { path: value.slice(0, separator).trim(), key: value.slice(separator + 1).trim() };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = await run(process.argv.slice(2));
}
