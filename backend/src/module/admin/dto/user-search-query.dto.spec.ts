import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SearchUsersQueryDto } from './search-users-query.dto.js';
import { UserTicketsQueryDto } from './user-tickets-query.dto.js';

describe('admin user query DTOs', () => {
  it('transforms a valid page size and rejects oversized search inputs', async () => {
    const valid = plainToInstance(SearchUsersQueryDto, {
      search: '  @gmail.com  ',
      limit: '25',
    });
    expect(await validate(valid)).toHaveLength(0);
    expect(valid.search).toBe('@gmail.com');
    expect(valid.limit).toBe(25);

    const invalid = plainToInstance(SearchUsersQueryDto, {
      search: 'x'.repeat(101),
      limit: '101',
      cursor: 'x'.repeat(2049),
    });
    const errors = await validate(invalid);
    expect(errors.map((error) => error.property).sort()).toEqual([
      'cursor',
      'limit',
      'search',
    ]);
  });

  it('rejects invalid ticket history page sizes, cursors, and sort orders', async () => {
    const query = plainToInstance(UserTicketsQueryDto, {
      limit: '0',
      cursor: 'x'.repeat(2049),
      sortOrder: 'sideways',
    });

    const errors = await validate(query);
    expect(errors.map((error) => error.property).sort()).toEqual([
      'cursor',
      'limit',
      'sortOrder',
    ]);
  });
});
