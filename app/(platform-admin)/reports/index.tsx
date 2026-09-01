import React, { useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Badge } from '@/components/Badge'
import { ListRow } from '@/components/ListRow'
import { Chip, ChipRow } from '@/components/Field'
import { LoadingView, ErrorState, EmptyState } from '@/components/States'
import { api } from '@/lib/api'
import { useApiInfinite } from '@/lib/use-api-query'
import { formatDateBn } from '@/lib/types'
import { colors, fonts, spacing } from '@/lib/theme'

const PER_PAGE = 25

type StatusFilter = 'OPEN' | 'REVIEWED'

export interface ReportItem {
  id: string
  contentType: string
  reason: string
  status: string
  description?: string | null
  createdAt: string
  reporter: { nameBn: string } | null
  reviewer?: { nameBn: string } | null
  reportedContent: Record<string, unknown> | null
}

export const CONTENT_TYPE_BN: Record<string, string> = {
  REVIEW: 'রিভিউ',
  ARTICLE: 'লেখা',
  IMAGE: 'ছবি',
  USER: 'ব্যবহারকারী',
  EBOOK_COMMENT: 'ই-বুক মন্তব্য',
}

/** Fetches one page of reports. Shared with the detail screen's lookup. */
export async function fetchReportsPage(page: number, status?: StatusFilter, perPage = PER_PAGE) {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) })
  if (status) params.set('status', status)
  const res = await api.get<{
    data: { items: ReportItem[]; openCount: number; pagination: { page: number; totalPages: number; totalItems: number } }
  }>(`/api/admin/reports?${params.toString()}`)
  return {
    items: res.data?.items ?? [],
    openCount: res.data?.openCount ?? 0,
    total: res.data?.pagination?.totalItems,
    hasMore: page < (res.data?.pagination?.totalPages ?? 1),
  }
}

export default function ReportsScreen() {
  const router = useRouter()
  const [status, setStatus] = useState<StatusFilter>('OPEN')
  const [openCount, setOpenCount] = useState<number | null>(null)

  const query = useApiInfinite<ReportItem>(
    async (page) => {
      const res = await fetchReportsPage(page, status)
      setOpenCount(res.openCount)
      return { items: res.items, total: res.total, hasMore: res.hasMore }
    },
    [status]
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={styles.filterRow}>
        <ChipRow>
          <Chip
            label={`খোলা${openCount != null ? ` (${openCount})` : ''}`}
            active={status === 'OPEN'}
            onPress={() => setStatus('OPEN')}
          />
          <Chip label="পর্যালোচিত" active={status === 'REVIEWED'} onPress={() => setStatus('REVIEWED')} />
        </ChipRow>
      </View>

      {query.loading && query.items.length === 0 ? (
        <LoadingView />
      ) : query.error && query.items.length === 0 ? (
        <ErrorState message={query.error} onRetry={query.reload} />
      ) : (
        <FlatList
          data={query.items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={query.refresh} tintColor={colors.navy} />}
          onEndReached={query.loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState icon="flag-outline" title="কোনো রিপোর্ট নেই" />}
          ListFooterComponent={
            query.loadingMore ? (
              <ActivityIndicator color={colors.navy} style={{ marginVertical: spacing.lg }} />
            ) : !query.hasMore && query.items.length > 0 ? (
              <Text style={styles.endLine}>তালিকা শেষ</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <ListRow
              title={item.reason || 'কারণ উল্লেখ নেই'}
              subtitle={`${item.reporter?.nameBn ?? 'অজানা'} · ${formatDateBn(item.createdAt)}`}
              right={
                <Badge
                  label={CONTENT_TYPE_BN[item.contentType] ?? item.contentType}
                  tone={item.status === 'OPEN' ? 'warning' : 'neutral'}
                />
              }
              // Only the id travels — the detail screen fetches live data.
              onPress={() => router.push(`/(platform-admin)/reports/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  filterRow: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  endLine: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary, textAlign: 'center', marginVertical: spacing.lg },
})
