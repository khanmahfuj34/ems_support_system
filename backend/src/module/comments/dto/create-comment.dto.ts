import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Validates the payload used to add a comment (reply) to a support ticket.
 *
 * Access is enforced by the service: users may comment only on their own
 * tickets; admins may comment on any ticket.
 */
export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Comment content must not be empty' })
  @MinLength(1, { message: 'Comment content must not be empty' })
  @MaxLength(5000, { message: 'Comment content must not exceed 5000 characters' })
  content!: string;
}
