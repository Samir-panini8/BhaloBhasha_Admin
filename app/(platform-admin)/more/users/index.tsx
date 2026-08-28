import React, { useState } from 'react'
import { View, Text, TextInput, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Badge } from '@/components/Badge'
import { ListRow } from '@/components/ListRow'
import { LoadingView, ErrorState, EmptyState } from '@/components/States'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { colors, fonts, spacing } from '@/lib/theme'

interface UserItem {
  id: string
  nameBn: string
  phone: string | null
  roles: string[]
  deletedAt: string | null
}

export default function UsersScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const { data, loading, refreshing, error, refresh } = useApiQuery(
    () => api.get<{ data: { items: UserItem[] } }>(`/api/admin/users?search=${encodeURIComponent(search)}`),
    [search]
  )

  const items = data?.data.items ?? []

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
      </View>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : items.length === 0 ? (
        <EmptyState icon="people-outline" title="কোনো ব্যবহারকারী পাওয়া যায়নি" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(u) => u.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
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
})
