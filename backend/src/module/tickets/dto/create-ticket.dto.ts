import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * Defines the priorities a user can select when creating a ticket.
 */
export const USER_TICKET_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;

/**
 * Validates the payload used to create a support ticket.
 *
 * Ownership, status, and SLA fields are assigned by the backend.
 */
export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @Matches(/^[1-9]\d*$/, {
    message: 'categoryId must be a positive integer string',
  })
  categoryId!: string;

  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: 'subCategoryId must be a positive integer string',
  })
  subCategoryId?: string;

  @IsIn(USER_TICKET_PRIORITIES)
  priority!: (typeof USER_TICKET_PRIORITIES)[number];
}