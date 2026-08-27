import { describe, expect, it } from 'vitest';
import { humanizeJsonPath } from '../src/web/humanizePath.js';

describe('humanizeJsonPath', () => {
  it('turns properties and zero-based array indexes into a readable breadcrumb', () => {
    expect(humanizeJsonPath('widget.motd.contests[0].contestKey'))
      .toBe('Widget → Motd → Contests → Item 1 ([0]) → Contest Key');
  });

  it('separates snake-case and kebab-case properties', () => {
    expect(humanizeJsonPath('response_data.user-name'))
      .toBe('Response data → User name');
  });

  it('describes the root path', () => {
    expect(humanizeJsonPath('$')).toBe('Entire JSON document');
  });
});
