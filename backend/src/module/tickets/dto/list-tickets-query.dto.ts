import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../search/search.constants.js';
import { USER_TICKET_PRIORITIES } from './create-ticket.dto.js';
import {
  TICKET_SORT_FIELDS,
  TICKET_SORT_ORDERS,
} from '../utils/ticket-cursor.js';

export class ListTicketsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number = DEFAULT_PAGE_SIZE;

  /**
   * Opaque keyset cursor returned as `pagination.nextCursor`. Offset/page
   * navigation is intentionally not supported.
   */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  statusId?: number;

  @IsOptional()
  @IsIn(USER_TICKET_PRIORITIES)
  priority?: (typeof USER_TICKET_PRIORITIES)[number];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(/^[1-9]\d*$/, {
    message: 'categoryId must be a positive integer string',
  })
  categoryId?: string;

  @IsOptional()
  @IsIn(TICKET_SORT_FIELDS)
  sortBy?: (typeof TICKET_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(TICKET_SORT_ORDERS)
  sortOrder?: (typeof TICKET_SORT_ORDERS)[number] = 'desc';

  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  @IsString()
  @MaxLength(100)
  search?: string;

  /**
   * Only count-oriented callers (dashboard KPIs) need the total. Normal
   * paginated search requests skip the expensive count query.
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeTotal?: boolean;
}
