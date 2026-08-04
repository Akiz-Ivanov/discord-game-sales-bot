//* Shared page-clamping used by both /wishlist list and /wishlist remove
//* — covers a caller passing an out-of-range page directly, and the
//* "removed the last item on the last page" case, since the item count
//* has already shrunk by the time this runs.
export const clampPage = (page: number, totalPages: number): number =>
  Math.min(Math.max(page, 0), totalPages - 1)

export const getTotalPages = (itemCount: number, pageSize: number): number =>
  Math.max(1, Math.ceil(itemCount / pageSize))
