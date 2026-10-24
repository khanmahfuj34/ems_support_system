"use client";

import { useEffect, useState } from "react";

import type { Category, SubCategory } from "@/features/categories/types/category.types";
import {
  getCategories,
  getSubcategories,
} from "@/features/categories/services/category.service";
import { getApiErrorMessage } from "@/lib/api/api-errors";

const CATEGORIES_ERROR_MESSAGE = "Failed to load active categories. Please try again.";
const SUBCATEGORIES_ERROR_MESSAGE = "Failed to load subcategories. Please try again.";

/**
 * Loads active ticket categories once (with retry) and the subcategories of
 * the currently selected category, mirroring the create-ticket form contract.
 */
export function useTicketCategoryOptions(selectedCategoryId: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoryRetry, setCategoryRetry] = useState(0);

  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [subcategoriesError, setSubcategoriesError] = useState<string | null>(null);
  const [subcategoryRetry, setSubcategoryRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void getCategories({ signal: controller.signal })
      .then(setCategories)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCategoriesError(getApiErrorMessage(error, CATEGORIES_ERROR_MESSAGE));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      });

    return () => controller.abort();
  }, [categoryRetry]);

  useEffect(() => {
    if (!selectedCategoryId) {
      return;
    }

    const controller = new AbortController();

    void getSubcategories(selectedCategoryId, { signal: controller.signal })
      .then(setSubcategories)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSubcategoriesError(getApiErrorMessage(error, SUBCATEGORIES_ERROR_MESSAGE));
      })
      .finally(() => {
        if (!controller.signal.aborted) setSubcategoriesLoading(false);
      });

    return () => controller.abort();
  }, [selectedCategoryId, subcategoryRetry]);

  const refreshCategories = () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    setCategoryRetry((attempt) => attempt + 1);
  };

  const refreshSubcategories = () => {
    setSubcategoriesLoading(true);
    setSubcategoriesError(null);
    setSubcategoryRetry((attempt) => attempt + 1);
  };

  /** Clears stale subcategory data after the category selection changed. */
  const resetSubcategories = () => {
    setSubcategories([]);
    setSubcategoriesError(null);
    setSubcategoriesLoading(false);
  };

  /** Marks the subcategory select as loading right after a category was
   * picked (event-side state writes keep effects pure). */
  const prepareSubcategories = () => {
    setSubcategories([]);
    setSubcategoriesLoading(true);
    setSubcategoriesError(null);
  };

  return {
    categories,
    categoriesLoading,
    categoriesError,
    refreshCategories,
    subcategories,
    subcategoriesLoading,
    subcategoriesError,
    refreshSubcategories,
    resetSubcategories,
    prepareSubcategories,
  };
}
