import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { TICKET_SORT_ORDERS } from '../../tickets/utils/ticket-cursor.js';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../../search/search.constants.js';

export class UserTicketsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cursor?: string;

  @IsOptional()
  @IsIn(TICKET_SORT_ORDERS)
  sortOrder?: (typeof TICKET_SORT_ORDERS)[number] = 'desc';
}
