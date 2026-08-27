import { describe, expect, it } from 'vitest';
import { objectContextForPath } from '../src/web/objectContext.js';

describe('objectContextForPath', () => {
  it('uses the first field of the nearest array item as its identity', () => {
    const json = { widgets: [{ name: 'motd', content: { contests: [{ contestKey: 'daily', title: 'A' }] } }] };
    expect(objectContextForPath(json, 'widgets[0].content.contests[0].title'))
      .toEqual({ key: 'contestKey', value: 'daily' });
  });

  it('uses the nearest parent object when the path has no array item', () => {
    const json = { widget: { name: 'motd', title: 'Hello' } };
    expect(objectContextForPath(json, 'widget.title')).toEqual({ key: 'name', value: 'motd' });
  });

  it('returns undefined when the object cannot be found', () => {
    expect(objectContextForPath({}, 'widgets[0].title')).toBeUndefined();
  });
});
