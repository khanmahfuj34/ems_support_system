import { inspect } from 'node:util';

import {
  buildMatchCondition,
  buildScopeConditions,
} from './ticket-search.query.js';

const emptyLookups = {
  categoryIds: [],
  subCategoryIds: [],
  statusIds: [],
  priorities: [],
  requesterIds: [],
};

describe('ticket search SQL', () => {
  it('escapes LIKE wildcards and uses the fixed escape character', () => {
    const sql = inspect(buildMatchCondition('100%_a!b', null, emptyLookups));

    expect(sql).toContain('!%');
    expect(sql).toContain('!_');
    expect(sql).toContain('!!');
    expect(sql).toContain("ESCAPE '!'");
  });

  it('matches an exact numeric id in addition to text fields', () => {
    const sql = inspect(buildMatchCondition('42', 42n, emptyLookups));

    expect(sql).toContain('t.id = ');
    expect(sql).toContain('42n');
  });

  it('uses the effective priority and owner scope', () => {
    const sql = inspect(
      buildScopeConditions({
        ownerId: 101n,
        priority: 'HIGH',
        statusId: 2,
        categoryId: 3n,
      }),
    );

    expect(sql).toContain('t.user_id = ');
    expect(sql).toContain('101n');
    expect(sql).toContain(
      'COALESCE(t.admin_priority, t.user_priority) = ',
    );
    expect(sql).toContain('HIGH');
    expect(sql).toContain('t.status_id = ');
    expect(sql).toContain('t.category_id = ');
  });
});
