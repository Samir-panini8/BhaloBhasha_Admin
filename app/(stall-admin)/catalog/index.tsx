import React, { useState } from 'react'
import { View, Text, TextInput, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { ListRow } from '@/components/ListRow'
import { Badge } from '@/components/Badge'
import { LoadingView, ErrorState, EmptyState } from '@/components/States'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { colors, fonts, spacing } from '@/lib/theme'

interface CatalogItem {
  id: string
  titleBn: string
  coverUrl: string | null
  prices: Array<{ region: string; price: number; currency: string; stock: number; trackInventory: boolean }>
  views7d: number
  orders7d: number
}

export default function CatalogScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const { data, loading, refreshing, error, refresh } = useApiQuery(
    () => api.get<{ data: { books: CatalogItem[] } }>(`/api/publisher/books?search=${encodeURIComponent(search)}`),
    [search]
  )

  const items = data?.data.books ?? []

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.secondary} />
        <TextInput
          style={styles.search}
          placeholder="নাম দিয়ে খুঁজুন"
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
        <EmptyState icon="book-outline" title="ক্যাটালগ খালি" subtitle="এখনো কোনো কাজ যোগ করা হয়নি" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
          renderItem={({ item }) => {
            const price = item.prices[0]
            const lowStock = price?.trackInventory && price.stock <= 3
            return (
              <ListRow
                title={item.titleBn}
                subtitle={price ? `${price.currency === 'INR' ? '৳' : price.currency} ${price.price} · স্টক: ${price.trackInventory ? price.stock : 'অসীম'}` : 'মূল্য নির্ধারিত নেই'}
                right={lowStock ? <Badge label="কম স্টক" tone="warning" /> : undefined}
                onPress={() => router.push(`/(stall-admin)/catalog/${item.id}`)}
              />
            )
          }}
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
