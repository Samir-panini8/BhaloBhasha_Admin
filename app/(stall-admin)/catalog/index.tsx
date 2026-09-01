import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Image, Pressable, ActivityIndicator, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Badge } from '@/components/Badge'
import { EmptyState, ErrorState, LoadingView } from '@/components/States'
import { api } from '@/lib/api'
import { useApiInfinite } from '@/lib/use-api-query'
import { formatMoney } from '@/lib/types'
import type { CatalogItem } from '@/lib/types'
import { colors, fonts, radius, spacing } from '@/lib/theme'

const PER_PAGE = 20

export default function Catalog() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  // Every keystroke used to fire a request and blank the list behind a
  // spinner; 350ms of quiet is enough to type a title.
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  const query = useApiInfinite<CatalogItem>(
    async (page) => {
      const params = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) })
      if (searchDebounced) params.set('search', searchDebounced)
      const res = await api.get<{ data: { books: CatalogItem[]; total: number; page: number; totalPages: number } }>(
        `/api/publisher/books?${params.toString()}`
      )
      const books = res.data?.books ?? []
      return { items: books, total: res.data?.total, hasMore: page < (res.data?.totalPages ?? 1) && books.length > 0 }
    },
    [searchDebounced]
  )

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={17} color={colors.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="শিরোনাম দিয়ে খুঁজুন"
          placeholderTextColor={colors.secondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={colors.secondary} />
          </Pressable>
        ) : null}
      </View>

      {query.total != null ? (
        <Text style={styles.countLine}>
          মোট {query.total}টি · দেখানো হচ্ছে {query.items.length}টি
        </Text>
      ) : null}

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
            <EmptyState
              icon="book-outline"
              title="কোনো পণ্য নেই"
              subtitle={searchDebounced ? 'এই নামে কিছু পাওয়া যায়নি' : 'নিচের + বোতামে নতুন বই বা সামগ্রী যোগ করুন'}
            />
          }
          ListFooterComponent={
            query.loadingMore ? (
              <ActivityIndicator color={colors.navy} style={{ marginVertical: spacing.lg }} />
            ) : !query.hasMore && query.items.length > 0 ? (
              <Text style={styles.endLine}>তালিকা শেষ</Text>
            ) : null
          }
          renderItem={({ item }) => <CatalogRow item={item} onPress={() => router.push(`/catalog/${item.id}`)} />}
        />
      )}

      <Pressable
        onPress={() => router.push('/catalog/new')}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}
        accessibilityLabel="নতুন পণ্য যোগ করুন"
      >
        <Ionicons name="add" size={26} color={colors.white} />
      </Pressable>
    </View>
  )
}

function CatalogRow({ item, onPress }: { item: CatalogItem; onPress: () => void }) {
  const price = item.prices[0]
  const lowStock = item.prices.some((p) => p.trackInventory && p.stock <= 3)
  const priceLine = item.prices.length
    ? item.prices.map((p) => formatMoney(p.price, p.currency)).join(' · ')
    : item.isPublicDomain
      ? 'পাবলিক ডোমেইন'
      : 'মূল্য দেওয়া হয়নি'
  const stockLine = price?.trackInventory ? ` · স্টক: ${price.stock}` : ''

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverEmpty]}>
          <Ionicons name={item.kind === 'MERCH' ? 'cube-outline' : 'book-outline'} size={18} color={colors.secondary} />
        </View>
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.title} numberOfLines={2}>{item.titleBn}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{priceLine}{stockLine}</Text>
        {item.authors.length ? (
          <Text style={styles.byline} numberOfLines={1}>{item.authors.map((a) => a.nameBn).join(', ')}</Text>
        ) : null}
      </View>
      {lowStock ? <Badge label="কম স্টক" tone="warning" /> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.parchment },
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
  countLine: {
    fontFamily: fonts.sansRegular,
    fontSize: 12,
    color: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.navyMist },
  cover: { width: 40, height: 56, borderRadius: radius.sm, backgroundColor: colors.parchment },
  coverEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.heading },
  subtitle: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.body },
  byline: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
  endLine: {
    fontFamily: fonts.sansRegular,
    fontSize: 12,
    color: colors.secondary,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
})
