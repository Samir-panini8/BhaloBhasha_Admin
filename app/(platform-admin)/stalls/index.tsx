import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Badge } from '@/components/Badge'
import { ListRow } from '@/components/ListRow'
import { Chip, ChipRow } from '@/components/Field'
import { LoadingView, ErrorState, EmptyState } from '@/components/States'
import { api } from '@/lib/api'
import { fetchPublisherAppsPage } from '@/lib/admin-lists'
import { useApiInfinite } from '@/lib/use-api-query'
import { formatDateBn, ORG_TYPE_BN } from '@/lib/types'
import type { OrgType } from '@/lib/types'
import { colors, fonts, radius, spacing } from '@/lib/theme'

const PER_PAGE = 25

type Tab = 'active' | 'applications'
type AppStatus = 'pending' | 'approved' | 'rejected' | 'all'

interface OrgItem {
  id: string
  nameBn: string
  type: OrgType
  isVerified: boolean
  isActive: boolean
  memberCount: number
  listingCount: number
}

type AppItem = Awaited<ReturnType<typeof fetchPublisherAppsPage>>['items'][number]

const APP_STATUS_BN: Record<AppItem['status'], string> = {
  pending: 'মুলতুবি',
  approved: 'অনুমোদিত',
  rejected: 'প্রত্যাখ্যাত',
}

/**
 * Stall list. Both tabs paginate now — the active tab used to ask for
 * `perPage=50` with no page 2, so the 51st stall did not exist as far as the
 * app was concerned, and applications were pinned to `status=pending`, which
 * made an approved or rejected application unreachable.
 */
export default function StallsScreen() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('active')
  const [appStatus, setAppStatus] = useState<AppStatus>('pending')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search.trim()), 400)
    return () => clearTimeout(timer)
  }, [search])

  const orgs = useApiInfinite<OrgItem>(
    async (page) => {
      const params = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) })
      if (searchDebounced) params.set('search', searchDebounced)
      const res = await api.get<{ data: OrgItem[]; total: number }>(`/api/admin/organizations?${params.toString()}`)
      const items = res.data ?? []
      return { items, total: res.total, hasMore: items.length === PER_PAGE }
    },
    [tab, searchDebounced]
  )

  const apps = useApiInfinite<AppItem>(
    async (page) => {
      // The endpoint honours only 'pending' and 'all' — every other value is
      // treated as pending. So approved/rejected are fetched as 'all' and
      // narrowed here; the page may come back short, which is fine.
      const serverStatus = appStatus === 'pending' ? 'pending' : 'all'
      const res = await fetchPublisherAppsPage(page, serverStatus, PER_PAGE)
      const items =
        appStatus === 'approved' || appStatus === 'rejected'
          ? res.items.filter((a) => a.status === appStatus)
          : res.items
      return {
        items,
        total: appStatus === 'pending' || appStatus === 'all' ? res.total : undefined,
        hasMore: res.hasMore,
      }
    },
    [tab, appStatus]
  )

  const active = tab === 'active'
  const query = active ? orgs : apps

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={styles.filterRow}>
        <Chip label="সক্রিয় স্টল" active={active} onPress={() => setTab('active')} />
        <Chip label="আবেদন" active={!active} onPress={() => setTab('applications')} />
      </View>

      {active ? (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color={colors.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="স্টলের নাম দিয়ে খুঁজুন"
            placeholderTextColor={colors.secondary}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={colors.secondary} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.appFilters}>
          <ChipRow>
            {(['pending', 'approved', 'rejected', 'all'] as AppStatus[]).map((s) => (
              <Chip
                key={s}
                label={s === 'all' ? 'সব' : APP_STATUS_BN[s]}
                active={appStatus === s}
                onPress={() => setAppStatus(s)}
              />
            ))}
          </ChipRow>
        </View>
      )}

      {query.total != null ? <Text style={styles.countLine}>মোট {query.total}টি</Text> : null}

      {query.loading && query.items.length === 0 ? (
        <LoadingView />
      ) : query.error && query.items.length === 0 ? (
        <ErrorState message={query.error} onRetry={query.reload} />
      ) : active ? (
        <FlatList
          data={orgs.items}
          keyExtractor={(o) => o.id}
          refreshControl={<RefreshControl refreshing={orgs.refreshing} onRefresh={orgs.refresh} tintColor={colors.navy} />}
          onEndReached={orgs.loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState icon="storefront-outline" title="কোনো স্টল নেই" />}
          ListFooterComponent={<ListFooter loading={orgs.loadingMore} done={!orgs.hasMore && orgs.items.length > 0} />}
          renderItem={({ item }) => (
            <ListRow
              title={item.nameBn}
              subtitle={`${ORG_TYPE_BN[item.type] ?? item.type} · ${item.memberCount} সদস্য · ${item.listingCount} লিস্টিং${item.isActive ? '' : ' · নিষ্ক্রিয়'}`}
              right={<Badge label={item.isVerified ? 'যাচাইকৃত' : 'অযাচাই'} tone={item.isVerified ? 'success' : 'neutral'} />}
              onPress={() => router.push(`/(platform-admin)/stalls/${item.id}`)}
            />
          )}
        />
      ) : (
        <FlatList
          data={apps.items}
          keyExtractor={(a) => a.id}
          refreshControl={<RefreshControl refreshing={apps.refreshing} onRefresh={apps.refresh} tintColor={colors.navy} />}
          onEndReached={apps.loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState icon="document-text-outline" title="কোনো আবেদন নেই" />}
          ListFooterComponent={<ListFooter loading={apps.loadingMore} done={!apps.hasMore && apps.items.length > 0} />}
          renderItem={({ item }) => (
            <ListRow
              title={item.nameBn}
              subtitle={`${ORG_TYPE_BN[item.type] ?? item.type} · ${formatDateBn(item.createdAt)}`}
              right={
                <Badge
                  label={APP_STATUS_BN[item.status]}
                  tone={item.status === 'pending' ? 'warning' : item.status === 'approved' ? 'success' : 'error'}
                />
              }
              // The id is enough — the detail screen fetches the application
              // itself instead of trusting a serialised copy in the url.
              onPress={() => router.push(`/(platform-admin)/stalls/application/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  )
}

function ListFooter({ loading, done }: { loading: boolean; done: boolean }) {
  if (loading) return <ActivityIndicator color={colors.navy} style={{ marginVertical: spacing.lg }} />
  if (done) return <Text style={styles.endLine}>তালিকা শেষ</Text>
  return null
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.sansRegular, fontSize: 15, color: colors.heading, padding: 0 },
  appFilters: { padding: spacing.lg, paddingBottom: spacing.sm },
  countLine: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  endLine: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary, textAlign: 'center', marginVertical: spacing.lg },
})
