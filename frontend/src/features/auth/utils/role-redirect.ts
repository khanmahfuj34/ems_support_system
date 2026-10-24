import { USER_ROLE } from "../types/auth.types";

/**
 * Maps a database role id to the dashboard route that role is allowed to use.
 * Used by route protection and login flows to keep redirects role-aware.
 */
export function dashboardForRole(roleId: number): string {
  if (roleId === USER_ROLE.USER) return "/";
  if (roleId === USER_ROLE.ADMIN) return "/admin/dashboard";
  return "/login";
}
