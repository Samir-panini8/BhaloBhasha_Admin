import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, FlatList, StyleSheet, RefreshControl, ActivityIndicator, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Badge } from '@/components/Badge'
import { ListRow } from '@/components/ListRow'
import { LoadingView, ErrorState, EmptyState } from '@/components/States'
import { api } from '@/lib/api'
import { Chip, ChipRow } from '@/components/Field'
import { useApiInfinite } from '@/lib/use-api-query'
import { colors, fonts, spacing } from '@/lib/theme'

interface UserItem {
  id: string
  nameBn: string
  phone: string | null
  roles: string[]
  deletedAt: string | null
}

const PER_PAGE = 25

type RoleFilter = 'all' | 'ADMIN' | 'PUBLISHER' | 'READER'
type StatusFilter = 'active' | 'suspended'

const ROLE_FILTERS: Array<{ value: RoleFilter; label: string }> = [
  { value: 'all', label: 'সব ভূমিকা' },
  { value: 'ADMIN', label: 'অ্যাডমিন' },
  { value: 'PUBLISHER', label: 'প্রকাশক' },
  { value: 'READER', label: 'পাঠক' },
]

export default function UsersScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')

  // Was one request per keystroke, each one blanking the list.
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search.trim()), 400)
    return () => clearTimeout(timer)
  }, [search])

  const query = useApiInfinite<UserItem>(
    async (page) => {
      const params = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE), status: statusFilter })
      if (searchDebounced) params.set('search', searchDebounced)
      if (roleFilter !== 'all') params.set('role', roleFilter)
      const res = await api.get<{
        data: { items: UserItem[]; pagination: { page: number; totalPages: number; totalItems: number } }
      }>(`/api/admin/users?${params.toString()}`)
      return {
        items: res.data?.items ?? [],
        total: res.data?.pagination?.totalItems,
        hasMore: page < (res.data?.pagination?.totalPages ?? 1),
      }
    },
    [searchDebounced, roleFilter, statusFilter]
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.secondary} />
        <TextInput
          style={styles.search}
          placeholder="নাম বা ফোন দিয়ে খুঁজুন"
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

      <View style={styles.filters}>
        <ChipRow>
          {ROLE_FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} active={roleFilter === f.value} onPress={() => setRoleFilter(f.value)} />
          ))}
        </ChipRow>
        <ChipRow>
          <Chip label="সক্রিয়" active={statusFilter === 'active'} onPress={() => setStatusFilter('active')} />
          <Chip label="স্থগিত" active={statusFilter === 'suspended'} onPress={() => setStatusFilter('suspended')} />
        </ChipRow>
      </View>

      {query.total != null ? <Text style={styles.countLine}>মোট {query.total} জন</Text> : null}

      {query.loading && query.items.length === 0 ? (
        <LoadingView />
      ) : query.error && query.items.length === 0 ? (
        <ErrorState message={query.error} onRetry={query.reload} />
      ) : (
        <FlatList
          data={query.items}
          keyExtractor={(u) => u.id}
          refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={query.refresh} tintColor={colors.navy} />}
          onEndReached={query.loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState icon="people-outline" title="কোনো ব্যবহারকারী পাওয়া যায়নি" />}
          ListFooterComponent={
            query.loadingMore ? (
              <ActivityIndicator color={colors.navy} style={{ marginVertical: spacing.lg }} />
            ) : !query.hasMore && query.items.length > 0 ? (
              <Text style={styles.endLine}>তালিকা শেষ</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <ListRow
              title={item.nameBn || 'নামহীন'}
              subtitle={item.phone ?? ''}
              right={<Badge label={item.roles.includes('ADMIN') ? 'ADMIN' : item.roles.includes('PUBLISHER') ? 'PUBLISHER' : 'READER'} tone={item.deletedAt ? 'error' : 'navy'} />}
              onPress={() => router.push(`/(platform-admin)/more/users/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: { flex: 1, paddingVertical: 10, fontFamily: fonts.sansRegular, fontSize: 14, color: colors.heading },
  filters: { paddingHorizontal: spacing.md, gap: spacing.sm },
  countLine: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary, padding: spacing.md, paddingBottom: spacing.sm },
  endLine: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary, textAlign: 'center', marginVertical: spacing.lg },
})
