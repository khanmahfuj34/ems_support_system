export const USER_ROLE = {
  USER: 1,
  ADMIN: 2,
} as const;

export type UserRoleId = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  roleId: number;
};

export type UserProfile = AuthUser & {
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type LoginResponse = {
  message: string;
  accessToken: string;
  tokenType: "Bearer";
  user: AuthUser;
};

export type RegisterResponse = {
  message: string;
  user: AuthUser;
};
