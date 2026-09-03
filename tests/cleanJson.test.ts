import { describe, expect, it } from 'vitest';
import { cleanAndPrettifyJsonInput, cleanJsonInput } from '../src/web/cleanJson.js';

describe('cleanJsonInput', () => {
  it('decodes HTML whitespace and repairs escaped underscore keys', () => {
    const pasted = String.raw`{ &#x20; "\\\_typ": "FootballLiveScoreboard", &#32; "running": true }`;
    expect(JSON.parse(cleanJsonInput(pasted))).toEqual({ _typ: 'FootballLiveScoreboard', running: true });
  });

  it('decodes commonly encoded JSON punctuation', () => {
    expect(JSON.parse(cleanJsonInput('{&quot;score&quot;: 1}'))).toEqual({ score: 1 });
  });

  it('removes a Markdown JSON fence', () => {
    expect(JSON.parse(cleanJsonInput('```json\n{"score": 1}\n```'))).toEqual({ score: 1 });
  });

  it('pretty-prints valid one-line JSON after cleaning it', () => {
    expect(cleanAndPrettifyJsonInput('{&quot;score&quot;:1,&quot;live&quot;:true}')).toBe(`{
  "score": 1,
  "live": true
}`);
  });
});
