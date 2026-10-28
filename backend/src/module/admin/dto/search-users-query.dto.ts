import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SEARCH_MAX_TERM_LENGTH,
} from '../../search/search.constants.js';

export class SearchUsersQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(SEARCH_MAX_TERM_LENGTH)
  search?: string;

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
}
