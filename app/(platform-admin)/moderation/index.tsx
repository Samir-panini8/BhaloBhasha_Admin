import React, { useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { Badge } from '@/components/Badge'
import { ListRow } from '@/components/ListRow'
import { LoadingView, ErrorState, EmptyState } from '@/components/States'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
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
  data: { items: ModerationItem[]; counts: Record<string, number> }
}

export default function ModerationQueue() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')

  const { data, loading, refreshing, error, refresh } = useApiQuery(
    () => api.get<ModerationResponse>(`/api/admin/moderation?type=${filter}`),
    [filter]
  )

  const items = data?.data.items ?? []
  const counts = data?.data.counts ?? {}

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterChip, filter === f.key && styles.filterChipActive]}>
            <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
              {f.label}
              {counts[f.key === 'all' ? 'all' : f.key === 'ebook_comment' ? 'ebookComment' : f.key] != null
                ? ` (${counts[f.key === 'all' ? 'all' : f.key === 'ebook_comment' ? 'ebookComment' : f.key]})`
                : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : items.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="সারি খালি" subtitle="এই মুহূর্তে পর্যালোচনার জন্য কিছু নেই" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
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
})
