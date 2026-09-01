/**
 * Two admin detail endpoints do not exist: `/api/admin/reports/[id]` and
 * `/api/admin/publisher-apps/[id]` expose only a PUT. The app used to work
 * around that by serialising the whole row into the navigation url, which
 * meant a detail screen acted on a stale copy (a report already reviewed
 * elsewhere still offered its buttons) and could not be deep-linked at all.
 *
 * This walks the list endpoint — which embeds everything the detail view
 * needs — until it finds the row, so the screen always renders live data.
 */
export async function findInPagedList<T extends { id: string }>(
  id: string,
  fetchPage: (page: number) => Promise<{ items: T[]; hasMore: boolean }>,
  maxPages = 6
): Promise<T | null> {
  for (let page = 1; page <= maxPages; page++) {
    const { items, hasMore } = await fetchPage(page)
    const found = items.find((item) => item.id === id)
    if (found) return found
    if (!hasMore || items.length === 0) return null
  }
  return null
}
