import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Chip, ChipRow } from '@/components/Field'
import { EmptyState, ErrorState, LoadingView } from '@/components/States'
import { api, ApiError } from '@/lib/api'
import { useApiInfinite } from '@/lib/use-api-query'
import { formatDateBn, formatMoney, ORDER_STATUS_BN, orderStatusTone, STALL_RESPONSE_BN, stallResponseTone } from '@/lib/types'
import type { AdminOrder, OrderStatus } from '@/lib/types'
import { colors, fonts, radius, spacing } from '@/lib/theme'

const PER_PAGE = 20

const STATUS_FILTERS: Array<{ value: 'all' | OrderStatus; label: string }> = [
  { value: 'all', label: 'সব' },
  { value: 'PENDING', label: 'অপেক্ষমাণ' },
  { value: 'PAID', label: 'পরিশোধিত' },
  { value: 'SHIPPED', label: 'প্রেরিত' },
  { value: 'DELIVERED', label: 'বিতরণকৃত' },
  { value: 'CANCELLED', label: 'বাতিল' },
]

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']

/**
 * Marketplace-wide order book (/api/admin/book-orders). The platform admin
 * side of the app previously showed order *counts* on the dashboard with
 * nothing to tap, so a paid order that no stall answered was invisible here.
 */
export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search.trim()), 400)
    return () => clearTimeout(timer)
  }, [search])

  const query = useApiInfinite<AdminOrder>(
    async (page) => {
      const params = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchDebounced) params.set('search', searchDebounced)
      const res = await api.get<{ data: AdminOrder[]; total: number }>(`/api/admin/book-orders?${params.toString()}`)
      const items = res.data ?? []
      return { items, total: res.total, hasMore: items.length === PER_PAGE }
    },
    [statusFilter, searchDebounced]
  )

  async function updateStatus(order: AdminOrder, next: OrderStatus) {
    if (next === order.status) return
    setBusyId(order.id)
    try {
      await api.patch(`/api/admin/book-orders/${order.id}`, { status: next })
      query.patchItem((o) => o.id === order.id, (o) => ({ ...o, status: next }))
    } catch (err) {
      Alert.alert('স্ট্যাটাস আপডেট করা যায়নি', err instanceof ApiError ? err.message : 'আবার চেষ্টা করুন')
    } finally {
      setBusyId(null)
    }
  }

  async function bookShipment(shipmentId: string) {
    setBookingId(shipmentId)
    try {
      const res = await api.post<{ data: { awbNumber?: string; alreadyBooked?: boolean } }>(`/api/shipments/${shipmentId}/book`)
      Alert.alert(
        'কুরিয়ার বুকিং',
        res.data?.alreadyBooked
          ? `এই পার্সেল আগেই বুক হয়েছে — ${res.data.awbNumber ?? ''}`
          : `বুক হয়েছে — ${res.data?.awbNumber ?? ''}`
      )
      query.refresh()
    } catch (err) {
      Alert.alert('বুকিং করা যায়নি', err instanceof ApiError ? err.message : 'আবার চেষ্টা করুন')
    } finally {
      setBookingId(null)
    }
  }

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="অর্ডার" subtitle={query.total != null ? `মোট ${query.total}টি অর্ডার` : 'বইমেলা মার্কেটপ্লেসের অর্ডার'} />

      <View style={styles.filters}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color={colors.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="অর্ডার আইডি, ক্রেতা বা স্টলের নাম"
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
        <ChipRow>
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} active={statusFilter === f.value} onPress={() => setStatusFilter(f.value)} />
          ))}
        </ChipRow>
      </View>

      {query.loading && query.items.length === 0 ? (
        <LoadingView />
      ) : query.error && query.items.length === 0 ? (
        <ErrorState message={query.error} onRetry={query.reload} />
      ) : (
        <FlatList
          data={query.items}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}
          refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={query.refresh} tintColor={colors.navy} />}
          onEndReached={query.loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="কোনো অর্ডার পাওয়া যায়নি" />}
          ListFooterComponent={
            query.loadingMore ? (
              <ActivityIndicator color={colors.navy} style={{ marginVertical: spacing.lg }} />
            ) : !query.hasMore && query.items.length > 0 ? (
              <Text style={styles.endLine}>তালিকা শেষ</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <AdminOrderCard
              order={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
              busy={busyId === item.id}
              bookingId={bookingId}
              onStatus={(next) => updateStatus(item, next)}
              onBookShipment={bookShipment}
            />
          )}
        />
      )}
    </View>
  )
}

function AdminOrderCard({
  order,
  expanded,
  onToggle,
  busy,
  bookingId,
  onStatus,
  onBookShipment,
}: {
  order: AdminOrder
  expanded: boolean
  onToggle: () => void
  busy: boolean
  bookingId: string | null
  onStatus: (next: OrderStatus) => void
  onBookShipment: (shipmentId: string) => void
}) {
  const firstStall = order.stalls[0]
  return (
    <View style={styles.card}>
      <Pressable onPress={onToggle} style={styles.cardHead}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.orderId}>{order.id.slice(0, 8)}</Text>
          <Text style={styles.buyer} numberOfLines={1}>
            {order.userName} · {order.userPhone ?? '—'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {firstStall ? firstStall.nameBn : 'স্টল নেই'}
            {order.stalls.length > 1 ? ` +${order.stalls.length - 1}` : ''} · {order.itemCount}টি ·{' '}
            {formatMoney(order.total, order.currency)} · {formatDateBn(order.createdAt)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          <Badge label={ORDER_STATUS_BN[order.status]} tone={orderStatusTone(order.status)} />
          {firstStall ? <Badge label={STALL_RESPONSE_BN[firstStall.response]} tone={stallResponseTone(firstStall.response)} /> : null}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.secondary} />
      </Pressable>

      {expanded ? (
        <View style={styles.cardBody}>
          <Text style={styles.sectionLabel}>পণ্য</Text>
          {order.items.map((item, index) => (
            <View key={`${item.bookId ?? item.stallId ?? 'line'}-${index}`} style={{ gap: 2 }}>
              <Text style={styles.itemTitle} numberOfLines={2}>{item.bookTitle}</Text>
              <Text style={styles.itemMeta}>
                {item.stallNameBn ?? '—'} · {item.quantity} × {formatMoney(item.price, order.currency)}
              </Text>
            </View>
          ))}

          {order.stalls.length ? (
            <>
              <Text style={styles.sectionLabel}>স্টলের উত্তর</Text>
              {order.stalls.map((s) => (
                <Text key={s.id} style={styles.body}>
                  {s.nameBn} — {STALL_RESPONSE_BN[s.response]}
                  {s.responseReason ? ` (${s.responseReason})` : ''}
                </Text>
              ))}
            </>
          ) : null}

          {order.discount > 0 ? <Text style={styles.body}>ছাড়: {formatMoney(order.discount, order.currency)}</Text> : null}
          {order.shippingTotal ? <Text style={styles.body}>ডেলিভারি: {formatMoney(order.shippingTotal, order.currency)}</Text> : null}
          {order.taxTotal ? <Text style={styles.body}>জিএসটি (দামের মধ্যে): {formatMoney(order.taxTotal, order.currency)}</Text> : null}
          {order.isGift ? <Text style={styles.meta}>উপহার অর্ডার</Text> : null}
          {order.paymentRef ? <Text style={styles.meta}>পেমেন্ট: {order.paymentRef} · {order.paymentGateway ?? ''}</Text> : null}

          {order.address ? (
            <>
              <Text style={styles.sectionLabel}>ঠিকানা</Text>
              <Text style={styles.body}>
                {[order.address.line1, order.address.line2, order.address.city, order.address.state, order.address.postalCode]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </>
          ) : null}

          {order.shipments?.length ? (
            <>
              <Text style={styles.sectionLabel}>পার্সেল</Text>
              {order.shipments.map((s) => (
                <View key={s.id} style={{ gap: spacing.xs }}>
                  <Text style={styles.body}>
                    {s.stallNameBn ?? 'পার্সেল'} · {s.billableGrams} গ্রাম{s.weightAssumed ? ' (আন্দাজি ওজন)' : ''} · {s.status}
                  </Text>
                  {s.awbNumber ? (
                    <Text style={styles.meta}>এওবি: {s.awbNumber}</Text>
                  ) : (
                    <Button
                      label="ডিটিডিসি বুক করুন"
                      variant="secondary"
                      loading={bookingId === s.id}
                      onPress={() => onBookShipment(s.id)}
                    />
                  )}
                  {s.lastError ? <Text style={styles.warn}>{s.lastError}</Text> : null}
                </View>
              ))}
            </>
          ) : null}

          <Text style={styles.sectionLabel}>স্ট্যাটাস বদলান</Text>
          {busy ? <ActivityIndicator color={colors.navy} /> : null}
          <ChipRow>
            {ALL_STATUSES.map((s) => (
              <Chip
                key={s}
                label={ORDER_STATUS_BN[s]}
                active={order.status === s}
                tone={s === 'CANCELLED' ? 'danger' : 'navy'}
                onPress={() => onStatus(s)}
              />
            ))}
          </ChipRow>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.parchment },
  filters: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.sansRegular, fontSize: 15, color: colors.heading, padding: 0 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  orderId: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.heading },
  buyer: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.body },
  meta: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
  body: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.body },
  cardBody: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.parchment,
  },
  sectionLabel: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.secondary, marginTop: spacing.xs },
  itemTitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.heading },
  itemMeta: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
  warn: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.error },
  endLine: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary, textAlign: 'center', marginVertical: spacing.lg },
})
