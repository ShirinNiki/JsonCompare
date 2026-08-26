# JSON Environment Comparator

A TypeScript/Node.js command-line tool for deeply comparing API response files from two environments. It supports field selection, recursive wildcards, ignore rules, configurable time fields, keyed array matching, and console/JSON/Markdown reports.

## Requirements and installation

- Node.js 20 or newer
- npm

```bash
npm install
npm run build
```

## Basic usage

```bash
npm run compare -- local.json uat.json
```

When no `--field` or `--fields-file` is supplied, every field is compared deeply. Arrays are order-sensitive by default. Exit status `0` means equal and `1` means differences were found, so the command can be used in CI.

## CLI options

| Option | Meaning |
|---|---|
| `--field <json-path>` | Compare only a selected path; repeatable |
| `--fields-file <path>` | Read selected paths from a file |
| `--ignore-field <json-path>` | Ignore a path after field selection; repeatable |
| `--ignore-fields-file <path>` | Read ignored paths from a file |
| `--ignore-time` | Ignore configured time leaf fields |
| `--array-key <path=key>` | Match objects in an array by a unique key; repeatable |
| `--format console\|json\|markdown` | Output format; defaults to `console` |
| `--output <path>` | Save the report instead of printing it |
| `--help` | Show command help |

Repeated and file-based paths are combined and automatically deduplicated. Ignore rules are applied after selected fields have been resolved. A selected field that exists on only one side is always reported.

## JSON paths and wildcards

The path syntax supports dot notation, array indexes, an array wildcard (`[*]`), a one-segment wildcard (`*`), and a recursive wildcard (`**`):

```text
view.widgets[*].id
content.contests[0].contestKey
**.price
view.*.status
```

Compare only important fields:

```bash
npm run compare -- local.json uat.json \
  --field "view.widgets[*].id" \
  --field "view.widgets[*].content.categories[*].contests[*].contestKey"
```

Compare everything except selected fields:

```bash
npm run compare -- local.json uat.json \
  --ignore-field "**.price" \
  --ignore-field "**.optimal" \
  --ignore-time
```

## Field files

`--fields-file` and `--ignore-fields-file` accept either one path per line (blank lines and `#` comments are ignored):

```text
view.widgets[*].id
**.contestKey
```

or a JSON array of strings:

```json
["view.widgets[*].id", "**.contestKey"]
```

## Time fields

Time fields are compared normally unless `--ignore-time` is present. The configured names live in [`src/config/time-fields.json`](src/config/time-fields.json):

```text
timestamp, timeStampBFFUtc, startTime, startDate, timeElapsedInGame,
createdAt, updatedAt, lastUpdated
```

Only the named leaf is ignored. Its parent object remains part of the comparison.

## Keyed arrays

Arrays use their indexes and order by default. Use `--array-key` to match objects by a unique key instead:

```bash
npm run compare -- local.json uat.json \
  --array-key "view.widgets=id" \
  --array-key "**.contests=contestKey" \
  --array-key "**.propositions=propositionKey"
```

Items missing the configured key are reported as `missing-array-key`. Duplicate key values are reported as `duplicate-array-key` and ambiguous items are never matched arbitrarily.

## Reports

Console output is concise and may truncate long values. JSON and Markdown preserve complete values and include paths, values, types, reasons, settings, and summary counts.

```bash
npm run compare -- local.json uat.json --format json --output report.json

npm run compare -- local.json uat.json \
  --ignore-time \
  --format markdown \
  --output comparison-report.md
```

Difference types are `changed`, `missing-in-local`, `missing-in-uat`, `added`, `removed`, `type-mismatch`, `array-order-mismatch`, `duplicate-array-key`, and `missing-array-key`.

## Exit codes

| Code | Meaning |
|---:|---|
| `0` | Equal under the selected rules |
| `1` | One or more differences found |
| `2` | Invalid CLI usage or invalid fields configuration |
| `3` | File read error, invalid input JSON, or internal error |

## Development

```bash
npm test
npm run test:watch
npm run lint
npm run build
```
