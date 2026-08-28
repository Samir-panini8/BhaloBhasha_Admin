import React, { useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { Badge } from '@/components/Badge'
import { ListRow } from '@/components/ListRow'
import { LoadingView, ErrorState, EmptyState } from '@/components/States'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { colors, fonts, spacing } from '@/lib/theme'

type StatusFilter = 'OPEN' | 'REVIEWED'

export interface ReportItem {
  id: string
  contentType: string
  reason: string
  status: string
  createdAt: string
  reporter: { nameBn: string } | null
  reportedContent: Record<string, unknown> | null
}

interface ReportsResponse {
  data: { items: ReportItem[]; openCount: number }
}

const CONTENT_TYPE_BN: Record<string, string> = {
  REVIEW: 'রিভিউ',
  ARTICLE: 'লেখা',
  IMAGE: 'ছবি',
  USER: 'ব্যবহারকারী',
}

export default function ReportsScreen() {
  const router = useRouter()
  const [status, setStatus] = useState<StatusFilter>('OPEN')

  const { data, loading, refreshing, error, refresh } = useApiQuery(
    () => api.get<ReportsResponse>(`/api/admin/reports?status=${status}`),
    [status]
  )

  const items = data?.data.items ?? []

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={styles.filterRow}>
        <Pressable onPress={() => setStatus('OPEN')} style={[styles.chip, status === 'OPEN' && styles.chipActive]}>
          <Text style={[styles.chipLabel, status === 'OPEN' && styles.chipLabelActive]}>খোলা {data ? `(${data.data.openCount})` : ''}</Text>
        </Pressable>
        <Pressable onPress={() => setStatus('REVIEWED')} style={[styles.chip, status === 'REVIEWED' && styles.chipActive]}>
          <Text style={[styles.chipLabel, status === 'REVIEWED' && styles.chipLabelActive]}>পর্যালোচিত</Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : items.length === 0 ? (
        <EmptyState icon="flag-outline" title="কোনো রিপোর্ট নেই" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
          renderItem={({ item }) => (
            <ListRow
              title={item.reason || 'কারণ উল্লেখ নেই'}
              subtitle={`${item.reporter?.nameBn ?? 'অজানা'} রিপোর্ট করেছেন`}
              right={<Badge label={CONTENT_TYPE_BN[item.contentType] ?? item.contentType} tone={item.status === 'OPEN' ? 'warning' : 'neutral'} />}
              onPress={() => router.push({ pathname: '/(platform-admin)/reports/[id]', params: { id: item.id, item: JSON.stringify(item) } })}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.navyMist },
  chipActive: { backgroundColor: colors.navy },
  chipLabel: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.navy },
  chipLabelActive: { color: colors.white },
})
