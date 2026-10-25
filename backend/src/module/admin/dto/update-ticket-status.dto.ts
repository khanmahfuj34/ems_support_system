import { Transform } from 'class-transformer';
import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const ADMIN_TICKET_TARGET_STATUSES = [
  'IN_PROGRESS',
  'WAITING_FOR_USER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
] as const;

export type AdminTicketTargetStatus =
  (typeof ADMIN_TICKET_TARGET_STATUSES)[number];

export class UpdateTicketStatusDto {
  @IsIn(ADMIN_TICKET_TARGET_STATUSES)
  status!: AdminTicketTargetStatus;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf(
    (dto: UpdateTicketStatusDto) =>
      dto.status === 'WAITING_FOR_USER' ||
      dto.status === 'REOPENED' ||
      dto.reason !== undefined,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf(
    (dto: UpdateTicketStatusDto) =>
      dto.status === 'RESOLVED' ||
      dto.resolutionSummary !== undefined,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  resolutionSummary?: string;
}