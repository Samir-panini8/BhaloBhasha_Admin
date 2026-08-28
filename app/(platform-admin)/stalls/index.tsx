import React, { useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { Badge } from '@/components/Badge'
import { ListRow } from '@/components/ListRow'
import { LoadingView, ErrorState, EmptyState } from '@/components/States'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { colors, fonts, spacing } from '@/lib/theme'

type Tab = 'active' | 'applications'

interface OrgItem {
  id: string
  nameBn: string
  type: string
  isVerified: boolean
  isActive: boolean
  memberCount: number
  listingCount: number
}

interface AppItem {
  id: string
  nameBn: string
  type: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

const ORG_TYPE_BN: Record<string, string> = {
  PUBLISHER: 'প্রকাশনা',
  SELLER: 'বিক্রেতা',
  PUBLISHER_AND_SELLER: 'প্রকাশনা ও বিক্রয়',
  ARTIST: 'রঙ্গ (শিল্পী)',
  ARTISAN: 'সোনাঝুরি (কারিগর)',
}

export default function StallsScreen() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('active')

  const orgsQuery = useApiQuery(
    () => api.get<{ data: OrgItem[] }>('/api/admin/organizations?perPage=50'),
    [tab === 'active']
  )
  const appsQuery = useApiQuery(
    () => api.get<{ data: { apps: AppItem[]; pendingCount: number } }>('/api/admin/publisher-apps?status=pending'),
    [tab === 'applications']
  )

  const active = tab === 'active'
  const loading = active ? orgsQuery.loading : appsQuery.loading
  const refreshing = active ? orgsQuery.refreshing : appsQuery.refreshing
  const error = active ? orgsQuery.error : appsQuery.error
  const refresh = active ? orgsQuery.refresh : appsQuery.refresh

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={styles.filterRow}>
        <Pressable onPress={() => setTab('active')} style={[styles.chip, active && styles.chipActive]}>
          <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>সক্রিয় স্টল</Text>
        </Pressable>
        <Pressable onPress={() => setTab('applications')} style={[styles.chip, !active && styles.chipActive]}>
          <Text style={[styles.chipLabel, !active && styles.chipLabelActive]}>
            আবেদন {appsQuery.data ? `(${appsQuery.data.data.pendingCount})` : ''}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : active ? (
        (orgsQuery.data?.data ?? []).length === 0 ? (
          <EmptyState icon="storefront-outline" title="কোনো স্টল নেই" />
        ) : (
          <FlatList
            data={orgsQuery.data!.data}
            keyExtractor={(o) => o.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
            renderItem={({ item }) => (
              <ListRow
                title={item.nameBn}
                subtitle={`${ORG_TYPE_BN[item.type] ?? item.type} · ${item.memberCount} সদস্য · ${item.listingCount} লিস্টিং`}
                right={<Badge label={item.isVerified ? 'যাচাইকৃত' : 'অযাচাই'} tone={item.isVerified ? 'success' : 'neutral'} />}
                onPress={() => router.push(`/(platform-admin)/stalls/${item.id}`)}
              />
            )}
          />
        )
      ) : (appsQuery.data?.data.apps ?? []).length === 0 ? (
        <EmptyState icon="document-text-outline" title="কোনো মুলতুবি আবেদন নেই" />
      ) : (
        <FlatList
          data={appsQuery.data!.data.apps}
          keyExtractor={(a) => a.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
          renderItem={({ item }) => (
            <ListRow
              title={item.nameBn}
              subtitle={ORG_TYPE_BN[item.type] ?? item.type}
              right={<Badge label="মুলতুবি" tone="warning" />}
              onPress={() =>
                router.push({ pathname: '/(platform-admin)/stalls/application/[id]', params: { id: item.id, item: JSON.stringify(item) } })
              }
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
