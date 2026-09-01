import React, { useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Badge } from '@/components/Badge'
import { ListRow } from '@/components/ListRow'
import { LoadingView, ErrorState, EmptyState } from '@/components/States'
import { api } from '@/lib/api'
import { useApiInfinite } from '@/lib/use-api-query'
import { colors, fonts, spacing } from '@/lib/theme'

type FilterType = 'all' | 'review' | 'article' | 'image' | 'ebook_comment'

const FILTERS: Array<{ key: FilterType; label: string }> = [
  { key: 'all', label: 'সব' },
  { key: 'review', label: 'রিভিউ' },
  { key: 'article', label: 'লেখা' },
  { key: 'image', label: 'ছবি' },
  { key: 'ebook_comment', label: 'ই-বুক মন্তব্য' },
]

const TYPE_LABEL_BN: Record<string, string> = {
  REVIEW: 'রিভিউ',
  ARTICLE: 'লেখা',
  IMAGE: 'ছবি',
  EBOOK_COMMENT: 'মন্তব্য',
}

interface ModerationItem {
  id: string
  contentType: keyof typeof TYPE_LABEL_BN
  title: string
  author: { nameBn: string }
  excerpt: string | null
}

interface ModerationResponse {
  data: {
    items: ModerationItem[]
    counts: Record<string, number>
    pagination: { page: number; perPage: number; totalItems: number; totalPages: number }
  }
}

const PER_PAGE = 25

/** The API's count keys are camelCase while its filter values are snake_case. */
function countKey(filter: FilterType): string {
  return filter === 'ebook_comment' ? 'ebookComment' : filter
}

export default function ModerationQueue() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')

  const [counts, setCounts] = useState<Record<string, number>>({})

  const query = useApiInfinite<ModerationItem>(
    async (page) => {
      const res = await api.get<ModerationResponse>(
        `/api/admin/moderation?type=${filter}&page=${page}&perPage=${PER_PAGE}`
      )
      setCounts(res.data?.counts ?? {})
      return {
        items: res.data?.items ?? [],
        total: res.data?.pagination?.totalItems,
        hasMore: page < (res.data?.pagination?.totalPages ?? 1),
      }
    },
    [filter]
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterChip, filter === f.key && styles.filterChipActive]}>
            <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
              {f.label}
              {counts[countKey(f.key)] != null ? ` (${counts[countKey(f.key)]})` : ''}
            </Text>
          </Pressable>
        ))}
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
          ListEmptyComponent={
            <EmptyState icon="checkmark-done-outline" title="সারি খালি" subtitle="এই মুহূর্তে পর্যালোচনার জন্য কিছু নেই" />
          }
          ListFooterComponent={
            query.loadingMore ? (
              <ActivityIndicator color={colors.navy} style={{ marginVertical: spacing.lg }} />
            ) : !query.hasMore && query.items.length > 0 ? (
              <Text style={styles.endLine}>তালিকা শেষ</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <ListRow
              title={item.title}
              subtitle={`${item.author.nameBn}${item.excerpt ? ' — ' + item.excerpt : ''}`}
              right={<Badge label={TYPE_LABEL_BN[item.contentType] ?? item.contentType} tone="navy" />}
              onPress={() => router.push(`/(platform-admin)/moderation/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.navyMist },
  filterChipActive: { backgroundColor: colors.navy },
  filterLabel: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.navy },
  filterLabelActive: { color: colors.white },
  endLine: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary, textAlign: 'center', marginVertical: spacing.lg },
})
