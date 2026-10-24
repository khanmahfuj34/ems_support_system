import type { AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { Category, SubCategory } from "../types/category.types";

interface CategoryListResponse {
  success: boolean;
  data: Category[];
}

interface SubcategoryListResponse {
  success: boolean;
  data: SubCategory[];
}

export async function getCategories(config?: AxiosRequestConfig): Promise<Category[]> {
  const { data } = await apiClient.get<CategoryListResponse>(
    API_ENDPOINTS.categories.list,
    config,
  );
  return data.data;
}

export async function getSubcategories(
  categoryId: string,
  config?: AxiosRequestConfig,
): Promise<SubCategory[]> {
  const { data } = await apiClient.get<SubcategoryListResponse>(
    API_ENDPOINTS.categories.subcategories(categoryId),
    config,
  );
  return data.data;
}
