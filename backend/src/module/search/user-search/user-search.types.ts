export interface UserSearchItem {
  id: string;
  name: string;
  email: string;
  roleId: number;
  isActive: boolean;
  createdAt: Date;
}

export interface UserProfile extends UserSearchItem {
  lastLoginAt: Date | null;
}

export interface UserSearchInput {
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface UserTicketsInput {
  limit?: number;
  cursor?: string;
  sortOrder?: 'asc' | 'desc';
}