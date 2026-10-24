/** Small centered window of page numbers, like the reference pager. */
export function buildPageItems(
  currentPage: number,
  totalPages: number,
  windowSize = 5,
): number[] {
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const result: number[] = [];
  for (let index = start; index <= end; index += 1) result.push(index);
  return result;
}

/** Pager items with gap markers, like 1 2 3 4 5 … 13. */
export function buildPageItemsWithGaps(
  current: number,
  totalPages: number,
): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const start = Math.max(1, Math.min(current - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const items: (number | "gap")[] = [];
  if (start > 1) {
    items.push(1);
    if (start > 2) items.push("gap");
  }
  for (let index = start; index <= end; index += 1) items.push(index);
  if (end < totalPages) {
    if (end < totalPages - 1) items.push("gap");
    items.push(totalPages);
  }
  return items;
}
