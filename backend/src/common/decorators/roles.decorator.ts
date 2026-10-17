import { SetMetadata } from '@nestjs/common';

/**
 * Defines the supported application roles.
 *
 * These IDs must match the seeded records in the user_roles table.
 */
export enum UserRoleId {
  USER = 1,
  ADMIN = 2,
}

/**
 * Metadata key used to identify the roles required by a route or controller.
 */
export const ROLES_KEY = 'required_roles';

/**
 * Restricts access to users who hold at least one of the specified roles.
 *
 * Apply this decorator together with JwtAuthGuard.
 */
export const Roles = (...roles: UserRoleId[]) =>
  SetMetadata(ROLES_KEY, roles);