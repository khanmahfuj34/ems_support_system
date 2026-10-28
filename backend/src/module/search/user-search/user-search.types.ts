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
