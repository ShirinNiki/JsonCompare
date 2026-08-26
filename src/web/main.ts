import './styles.css';
import { compareJson } from '../compare/comparator.js';
import type { ComparisonResult, Difference, JsonValue } from '../compare/types.js';
import configuredTimeFields from '../config/time-fields.json' with { type: 'json' };
import { jsonReport } from '../report/jsonReporter.js';
import { markdownReport } from '../report/markdownReporter.js';

type Side = 'local' | 'uat';
type ReportFormat = 'json' | 'markdown';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Application root was not found');

app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#"><span class="brand-mark"><i></i><i></i></span><span>JSON <b>Compare</b></span></a>
    <div class="privacy-pill"><span></span> Runs locally · your data stays here</div>
  </header>
  <main>
    <section class="hero">
      <div class="eyebrow">ENVIRONMENT RESPONSE ANALYZER</div>
      <h1>Spot the difference.<br><em>Ship with confidence.</em></h1>
      <p>Compare deeply nested JSON responses across environments—with precise paths, smart ignores, and keyed array matching.</p>
    </section>
    <section class="workspace" aria-label="JSON inputs">
      ${editorCard('local', 'Environment 1', 'LOCAL')}
      <div class="versus" aria-hidden="true"><span></span><b>VS</b><span></span></div>
      ${editorCard('uat', 'Environment 2', 'INT')}
    </section>
    <section class="options-card">
      <button class="options-heading" id="toggle-options" aria-expanded="true">
        <span class="sliders-icon">≡</span><span><b>Comparison options</b><small>Fine-tune what matters in this comparison</small></span><span class="chevron">⌃</span>
      </button>
      <div class="options-body" id="options-body"><div class="option-grid">
        <label class="field-label"><span>Important fields <small>Only compare these paths</small></span><textarea id="fields" rows="3" placeholder="view.widgets[*].id&#10;**.contestKey"></textarea></label>
        <label class="field-label"><span>Ignored fields <small>Applied after selection</small></span><textarea id="ignore-fields" rows="3" placeholder="**.price&#10;**.optimal"></textarea></label>
        <label class="field-label"><span>Array matching keys <small>One path=key rule per line</small></span><textarea id="array-keys" rows="3" placeholder="view.widgets=id&#10;**.contests=contestKey"></textarea></label>
        <div class="toggle-setting"><div><b>Ignore time fields</b><small>Skip configured timestamp and date leaves.</small></div><label class="switch"><input id="ignore-time" type="checkbox"><span></span></label></div>
      </div></div>
    </section>
    <div class="action-row"><button id="compare-button" class="compare-button"><span>Compare environments</span><b>→</b></button><button id="clear-button" class="clear-button">Clear all</button></div>
    <section id="result" class="results" hidden aria-live="polite"></section>
  </main>
  <footer><span>JSON Compare</span><span>Built for reliable releases</span></footer>
`;

function editorCard(side: Side, caption: string, defaultName: string): string {
  return `<article class="editor-card" data-side="${side}">
    <div class="editor-head"><div><span class="env-dot ${side}"></span><span>${caption}</span></div><label class="environment-name"><span>Name</span><input id="${side}-name" value="${defaultName}" maxlength="24"></label></div>
    <div class="editor-tools"><button class="tool-button active" data-mode="paste" data-side="${side}">Paste JSON</button><button class="tool-button" data-mode="file" data-side="${side}">Import file</button><span class="file-name" id="${side}-file-name">No file selected</span></div>
    <div class="editor-wrap" data-drop-side="${side}"><div class="line-number">1</div><textarea id="${side}-json" spellcheck="false" aria-label="${caption} JSON" placeholder='{&#10;  "paste": "${defaultName.toLowerCase()} response here"&#10;}'></textarea><input id="${side}-file" type="file" accept=".json,application/json" hidden><div class="drop-overlay"><b>Drop JSON file here</b><span>Release to load it</span></div></div>
    <div class="editor-status" id="${side}-status"><span class="status-idle"></span> Waiting for JSON</div>
  </article>`;
}

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element as T;
};
const inputs = { local: byId<HTMLTextAreaElement>('local-json'), uat: byId<HTMLTextAreaElement>('uat-json') };

document.querySelectorAll<HTMLButtonElement>('.tool-button').forEach(button => button.addEventListener('click', () => {
  const side = button.dataset.side as Side;
  if (button.dataset.mode === 'file') byId<HTMLInputElement>(`${side}-file`).click(); else inputs[side].focus();
}));

(['local', 'uat'] as Side[]).forEach(side => {
  const fileInput = byId<HTMLInputElement>(`${side}-file`);
  fileInput.addEventListener('change', () => { const file = fileInput.files?.[0]; if (file) void loadFile(side, file); });
  inputs[side].addEventListener('input', () => validateEditor(side));
  const dropTarget = document.querySelector<HTMLElement>(`[data-drop-side="${side}"]`)!;
  ['dragenter', 'dragover'].forEach(name => dropTarget.addEventListener(name, event => { event.preventDefault(); dropTarget.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach(name => dropTarget.addEventListener(name, event => { event.preventDefault(); dropTarget.classList.remove('dragging'); }));
  dropTarget.addEventListener('drop', event => { const file = event.dataTransfer?.files[0]; if (file) void loadFile(side, file); });
});

async function loadFile(side: Side, file: File): Promise<void> {
  inputs[side].value = await file.text();
  byId(`${side}-file-name`).textContent = file.name;
  validateEditor(side);
}

function validateEditor(side: Side): JsonValue | undefined {
  const value = inputs[side].value.trim();
  const status = byId(`${side}-status`);
  if (!value) { status.innerHTML = '<span class="status-idle"></span> Waiting for JSON'; inputs[side].classList.remove('invalid'); return undefined; }
  try {
    const parsed = JSON.parse(value) as JsonValue;
    const count = parsed !== null && typeof parsed === 'object' ? Object.keys(parsed).length : 1;
    status.innerHTML = `<span class="status-valid">✓</span> Valid JSON · ${count} top-level ${count === 1 ? 'entry' : 'entries'}`;
    inputs[side].classList.remove('invalid');
    return parsed;
  } catch (error) {
    status.innerHTML = `<span class="status-error">!</span> ${escapeHtml(error instanceof Error ? error.message : 'Invalid JSON')}`;
    inputs[side].classList.add('invalid');
    return undefined;
  }
}

byId('toggle-options').addEventListener('click', () => {
  const collapsed = byId('options-body').classList.toggle('collapsed');
  byId('toggle-options').setAttribute('aria-expanded', String(!collapsed));
  byId('toggle-options').querySelector('.chevron')!.textContent = collapsed ? '⌄' : '⌃';
});

byId('clear-button').addEventListener('click', () => {
  Object.values(inputs).forEach(input => { input.value = ''; input.classList.remove('invalid'); });
  (['local', 'uat'] as Side[]).forEach(side => { byId(`${side}-file-name`).textContent = 'No file selected'; byId(`${side}-status`).innerHTML = '<span class="status-idle"></span> Waiting for JSON'; });
  ['fields', 'ignore-fields', 'array-keys'].forEach(id => { byId<HTMLTextAreaElement>(id).value = ''; });
  byId<HTMLInputElement>('ignore-time').checked = false;
  byId('result').hidden = true;
});

byId('compare-button').addEventListener('click', () => {
  const local = validateEditor('local'); const uat = validateEditor('uat');
  if (local === undefined || uat === undefined) { showInputError('Add valid JSON to both environments before comparing.'); return; }
  try {
    const result = compareJson(local, uat, { fields: readLines('fields'), ignoreFields: readLines('ignore-fields'), ignoreTime: byId<HTMLInputElement>('ignore-time').checked, timeFields: configuredTimeFields, arrayKeys: readLines('array-keys').map(parseArrayRule) });
    renderResult(result);
  } catch (error) { showInputError(error instanceof Error ? error.message : String(error)); }
});

function readLines(id: string): string[] { return [...new Set(byId<HTMLTextAreaElement>(id).value.split(/\r?\n|,/).map(line => line.trim()).filter(Boolean))]; }
function parseArrayRule(rule: string): { path: string; key: string } {
  const separator = rule.lastIndexOf('=');
  if (separator < 1 || separator === rule.length - 1) throw new Error(`Invalid array rule “${rule}”. Use path=key.`);
  return { path: rule.slice(0, separator).trim(), key: rule.slice(separator + 1).trim() };
}
function showInputError(message: string): void {
  const result = byId('result'); result.hidden = false; result.innerHTML = `<div class="result-error"><b>Couldn’t compare yet</b><span>${escapeHtml(message)}</span></div>`; result.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderResult(result: ComparisonResult): void {
  const section = byId('result');
  const localName = byId<HTMLInputElement>('local-name').value.trim() || 'LOCAL'; const uatName = byId<HTMLInputElement>('uat-name').value.trim() || 'INT'; const summary = result.summary;
  section.hidden = false;
  section.innerHTML = `<div class="result-head"><div class="result-verdict ${result.equal ? 'equal' : 'different'}"><span>${result.equal ? '✓' : '≠'}</span><div><small>COMPARISON COMPLETE</small><h2>${result.equal ? 'Environments match' : `${summary.totalDifferences} ${summary.totalDifferences === 1 ? 'difference' : 'differences'} found`}</h2></div></div><div class="download-group"><select id="download-format"><option value="json">JSON report</option><option value="markdown">Markdown report</option></select><button id="download-button">Download</button></div></div>
    <div class="metrics">${metric('Total', summary.totalDifferences)}${metric('Changed', summary.valuesChanged)}${metric('Missing', summary.missingFields)}${metric('Added', summary.itemsAdded)}${metric('Removed', summary.itemsRemoved)}${metric('Type mismatch', summary.typeMismatches)}</div>
    ${result.differences.length ? differenceTable(result.differences, localName, uatName) : '<div class="empty-result"><span>✓</span><b>No differences under the selected rules.</b><small>These responses are safe to treat as equivalent.</small></div>'}`;
  byId('download-button').addEventListener('click', () => { const format = byId<HTMLSelectElement>('download-format').value as ReportFormat; const content = format === 'json' ? jsonReport(result) : markdownReport(result); download(content, `comparison-report.${format === 'json' ? 'json' : 'md'}`, format === 'json' ? 'application/json' : 'text/markdown'); });
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function metric(label: string, value: number): string { return `<div><strong>${value}</strong><span>${label}</span></div>`; }
function differenceTable(differences: Difference[], localName: string, uatName: string): string {
  return `<div class="table-wrap"><table><thead><tr><th>Path</th><th>${escapeHtml(localName)}</th><th>${escapeHtml(uatName)}</th><th>Difference</th></tr></thead><tbody>${differences.map(item => `<tr><td><code>${escapeHtml(item.path)}</code>${item.reason ? `<small>${escapeHtml(item.reason)}</small>` : ''}</td><td>${formatValue(item.local)}</td><td>${formatValue(item.uat)}</td><td><span class="diff-badge ${item.type}">${item.type}</span></td></tr>`).join('')}</tbody></table></div>`;
}
function formatValue(value: JsonValue | undefined): string {
  if (value === undefined) return '<span class="missing">&lt;missing&gt;</span>';
  const rendered = typeof value === 'string' ? value : JSON.stringify(value);
  return `<code title="${escapeHtml(rendered)}">${escapeHtml(rendered.length > 100 ? `${rendered.slice(0, 99)}…` : rendered)}</code>`;
}
function download(content: string, fileName: string, type: string): void {
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = fileName; link.click(); URL.revokeObjectURL(link.href);
}
function escapeHtml(value: string): string { return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!); }
