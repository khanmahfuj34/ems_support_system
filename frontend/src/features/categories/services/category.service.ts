import type { AxiosError, AxiosRequestConfig } from "axios";

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

type ApiErrorBody = {
  message?: string | string[];
};

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

export function getCategoryApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<ApiErrorBody>;
  const message = axiosError.response?.data?.message;

  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string" && message.trim()) return message;
  if (axiosError.code === "ERR_NETWORK") {
    return "The SupportDesk API could not be reached. Check that the backend is running.";
  }

  return fallback;
}
