export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  subCategories: SubCategory[];
}
