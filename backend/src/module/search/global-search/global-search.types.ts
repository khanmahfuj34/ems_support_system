export interface SearchGroup<T> {
  items: T[];
  /** More matches exist than were returned. */
  hasMore: boolean;
  /** The scan budget ran out before the group filled (older items not checked). */
  partial?: boolean;
  /** This group failed (timeout, overload). Other groups are still valid. */
  failed?: boolean;
}

export interface CategorySearchItem {
  id: string;
  name: string;
}

export interface SubCategorySearchItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}