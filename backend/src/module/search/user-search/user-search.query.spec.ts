import { inspect } from 'node:util';

import { findUserIds } from './user-search.query.js';

describe('user search SQL', () => {
  it.each(['@gmail.com', 'gmai', 'mahfuj'])(
    'uses escaped substring patterns for names and emails: %s',
    async (term) => {
      const db = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: 42n }]),
      };

      await findUserIds(db as never, term, null, undefined, 11);

      const sql = inspect(db.$queryRaw.mock.calls[0]);
      expect(sql).toContain('u.name LIKE');
      expect(sql).toContain('u.email LIKE');
      expect(sql).toContain(`%${term}%`);
      expect(sql).toContain("ESCAPE '!' ");
    },
  );

  it('escapes LIKE wildcards and includes the exact numeric ID predicate', async () => {
    const db = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 42n }]),
    };

    await findUserIds(db as never, '100%_!', 42n, undefined, 11);

    const sql = inspect(db.$queryRaw.mock.calls[0]);
    expect(sql).toContain('%100!%!_!!%');
    expect(sql).toContain('u.id = ');
    expect(sql).toContain('42n');
  });
});
