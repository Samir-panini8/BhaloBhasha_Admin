import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Chip, ChipRow } from '@/components/Field'
import { EmptyState, ErrorState, LoadingView } from '@/components/States'
import { api, ApiError } from '@/lib/api'
import { useApiInfinite } from '@/lib/use-api-query'
import { useAuth } from '@/lib/auth-context'
import {
  canWriteCatalog,
  formatDateBn,
  formatMoney,
  ORDER_STATUS_BN,
  orderStatusTone,
  STALL_RESPONSE_BN,
  stallResponseTone,
} from '@/lib/types'
import type { OrderStatus, StallOrder, StallResponse } from '@/lib/types'
import { colors, fonts, radius, spacing } from '@/lib/theme'

const PER_PAGE = 20

const RESPONSE_FILTERS: Array<{ value: 'all' | StallResponse; label: string }> = [
  { value: 'all', label: 'সব' },
  { value: 'PENDING', label: 'উত্তরের অপেক্ষায়' },
  { value: 'ACCEPTED', label: 'গৃহীত' },
  { value: 'DECLINED', label: 'ফেরানো' },
]

const STATUS_FILTERS: Array<{ value: 'all' | OrderStatus; label: string }> = [
  { value: 'all', label: 'সব স্ট্যাটাস' },
  { value: 'PENDING', label: 'অপেক্ষমাণ' },
  { value: 'PAID', label: 'পরিশোধিত' },
  { value: 'SHIPPED', label: 'প্রেরিত' },
  { value: 'DELIVERED', label: 'বিতরণকৃত' },
  { value: 'CANCELLED', label: 'বাতিল' },
]

const NEXT_STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']

/**
 * The stall's own order book. Orders reach a stall through
 * /api/publisher/orders — until now the app showed only a count on the
 * dashboard, so a stall had no way to see, accept or fulfil an order from the
 * phone.
 *
 * Rows expand in place rather than pushing a detail screen: the endpoint has
 * no get-by-id, and answering an order should not make it jump out from under
 * the finger.
 */
export default function StallOrders() {
  const { persona, orgMemberships } = useAuth()
  const [responseFilter, setResponseFilter] = useState<'all' | StallResponse>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')

  const role = useMemo(
    () => (persona?.kind === 'stall' ? orgMemberships.find((m) => m.organization.id === persona.orgId)?.role : undefined),
    [persona, orgMemberships]
  )
  // No membership row can mean a legacy publisher's implicit OWNER seat —
  // the server is the authority, so the UI stays enabled.
  const canAct = role ? canWriteCatalog(role) : true

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search.trim()), 400)
    return () => clearTimeout(timer)
  }, [search])

  const query = useApiInfinite<StallOrder>(
    async (page) => {
      const params = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (responseFilter !== 'all') params.set('response', responseFilter)
      if (searchDebounced) params.set('search', searchDebounced)
      const res = await api.get<{ data: StallOrder[]; total: number }>(`/api/publisher/orders?${params.toString()}`)
      const items = res.data ?? []
      return { items, total: res.total, hasMore: items.length === PER_PAGE }
    },
    [statusFilter, responseFilter, searchDebounced]
  )

  async function patchOrder(
    order: StallOrder,
    body: { status?: OrderStatus; response?: 'ACCEPTED' | 'DECLINED'; reason?: string },
    success: string
  ) {
    setBusyId(order.id)
    try {
      const res = await api.patch<{
        data: { status: OrderStatus; stallResponse: StallResponse; stallResponseReason: string | null; stallRespondedAt: string | null }
      }>(`/api/publisher/orders/${order.id}`, body)
      // Patch in place — a refetch would reshuffle the list under the user.
      query.patchItem(
        (o) => o.id === order.id,
        (o) => ({
          ...o,
          status: res.data.status,
          stallResponse: res.data.stallResponse,
          stallResponseReason: res.data.stallResponseReason,
          stallRespondedAt: res.data.stallRespondedAt,
        })
      )
      setDecliningId(null)
      setDeclineReason('')
      Alert.alert('হয়ে গেছে', success)
    } catch (err) {
      Alert.alert('আপডেট করা যায়নি', err instanceof ApiError ? err.message : 'আবার চেষ্টা করুন')
    } finally {
      setBusyId(null)
    }
  }

  function handleStatus(order: StallOrder, next: OrderStatus) {
    if (next === order.status) return
    const apply = () => patchOrder(order, { status: next }, 'স্ট্যাটাস আপডেট হয়েছে')
    if (!order.isSoleStall) {
      Alert.alert(
        'যৌথ অর্ডার',
        'এই অর্ডারে আরও স্টলের পণ্য আছে। স্ট্যাটাস বদলালে পুরো অর্ডারের স্ট্যাটাস বদলাবে। এগোবেন?',
        [{ text: 'বাতিল', style: 'cancel' }, { text: 'এগোন', onPress: apply }]
      )
      return
    }
    apply()
  }

  function submitDecline(order: StallOrder) {
    const reason = declineReason.trim()
    if (!reason) {
      Alert.alert('কারণ লিখুন', 'অর্ডার ফেরানোর কারণ না লিখলে ফেরানো যায় না।')
      return
    }
    patchOrder(
      order,
      { response: 'DECLINED', reason },
      order.isSoleStall ? 'অর্ডার ফেরানো হয়েছে এবং বাতিল করা হয়েছে' : 'অর্ডার ফেরানো হয়েছে — প্ল্যাটফর্ম অ্যাডমিন দেখবেন'
    )
  }

  const pendingOnPage = query.items.filter((o) => o.stallResponse === 'PENDING').length

  return (
    <View style={styles.wrap}>
      <ScreenHeader
        title="অর্ডার"
        subtitle={query.total != null ? `মোট ${query.total}টি · এই পাতায় ${pendingOnPage}টি উত্তরের অপেক্ষায়` : 'আপনার স্টলের অর্ডার'}
      />

      <View style={styles.filters}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color={colors.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="অর্ডার আইডি, ক্রেতার নাম বা ফোন"
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
          {RESPONSE_FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} active={responseFilter === f.value} onPress={() => setResponseFilter(f.value)} />
          ))}
        </ChipRow>
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
            <OrderCard
              order={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
              canAct={canAct}
              busy={busyId === item.id}
              declining={decliningId === item.id}
              declineReason={declineReason}
              onDeclineReason={setDeclineReason}
              onStartDecline={() => {
                setExpandedId(item.id)
                setDecliningId(item.id)
                setDeclineReason('')
              }}
              onCancelDecline={() => setDecliningId(null)}
              onSubmitDecline={() => submitDecline(item)}
              onAccept={() => patchOrder(item, { response: 'ACCEPTED' }, 'অর্ডার গ্রহণ করা হয়েছে')}
              onStatus={(next) => handleStatus(item, next)}
            />
          )}
        />
      )}
    </View>
  )
}

function OrderCard({
  order,
  expanded,
  onToggle,
  canAct,
  busy,
  declining,
  declineReason,
  onDeclineReason,
  onStartDecline,
  onCancelDecline,
  onSubmitDecline,
  onAccept,
  onStatus,
}: {
  order: StallOrder
  expanded: boolean
  onToggle: () => void
  canAct: boolean
  busy: boolean
  declining: boolean
  declineReason: string
  onDeclineReason: (text: string) => void
  onStartDecline: () => void
  onCancelDecline: () => void
  onSubmitDecline: () => void
  onAccept: () => void
  onStatus: (next: OrderStatus) => void
}) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onToggle} style={styles.cardHead}>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.headLine}>
            <Text style={styles.orderId}>{order.displayId}</Text>
            {!order.isSoleStall ? <Badge label="যৌথ" tone="neutral" /> : null}
          </View>
          <Text style={styles.buyer} numberOfLines={1}>
            {order.userName} · {order.userPhone ?? '—'}
          </Text>
          <Text style={styles.meta}>
            {order.stallUnits}টি · আপনার প্রাপ্য {formatMoney(order.stallSubtotal, order.currency)} · {formatDateBn(order.createdAt)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          <Badge label={STALL_RESPONSE_BN[order.stallResponse]} tone={stallResponseTone(order.stallResponse)} />
          <Badge label={ORDER_STATUS_BN[order.status]} tone={orderStatusTone(order.status)} />
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.secondary} />
      </Pressable>

      {expanded ? (
        <View style={styles.cardBody}>
          {!order.isSoleStall ? (
            <Text style={styles.warn}>এই অর্ডারে আরও স্টলের পণ্য আছে — স্ট্যাটাস বদলালে পুরো অর্ডারে প্রভাব পড়বে।</Text>
          ) : null}

          <Text style={styles.sectionLabel}>আপনার পণ্য</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemTitle} numberOfLines={2}>{item.bookTitle}</Text>
              <Text style={styles.itemMeta}>
                {item.quantity} × {formatMoney(item.price, order.currency)} = {formatMoney(item.netAmount, order.currency)}
              </Text>
            </View>
          ))}
          <Text style={styles.meta}>কুপনের ভাগ বাদ দিয়ে আপনার প্রাপ্য {formatMoney(order.stallSubtotal, order.currency)}</Text>
          {order.isGift ? <Text style={styles.meta}>উপহার অর্ডার</Text> : null}
          {order.paymentGateway ? <Text style={styles.meta}>পেমেন্ট: {order.paymentGateway}</Text> : null}

          {order.address ? (
            <>
              <Text style={styles.sectionLabel}>ডেলিভারি ঠিকানা</Text>
              <Text style={styles.body}>
                {[order.address.line1, order.address.line2, order.address.city, order.address.state, order.address.postalCode]
                  .filter(Boolean)
                  .join(', ')}
                {order.address.phone ? `\n${order.address.phone}` : ''}
              </Text>
            </>
          ) : null}

          {order.shipments.length ? (
            <>
              <Text style={styles.sectionLabel}>আপনার পার্সেল</Text>
              {order.shipments.map((s) => (
                <Text key={s.id} style={styles.body}>
                  {s.billableGrams} গ্রাম{s.weightAssumed ? ' (আন্দাজি ওজন)' : ''} · {s.status}
                  {s.awbNumber ? ` · ${s.awbNumber}` : ''}
                </Text>
              ))}
              <Text style={styles.meta}>কুরিয়ার বুকিং প্ল্যাটফর্ম অ্যাডমিন করেন।</Text>
            </>
          ) : null}

          {order.stallResponseReason ? (
            <Text style={styles.warn}>ফেরানোর কারণ: {order.stallResponseReason}</Text>
          ) : null}

          {!canAct ? (
            <Text style={styles.meta}>আপনার সিটে অর্ডারে কাজ করার অনুমতি নেই।</Text>
          ) : order.stallResponse === 'PENDING' ? (
            declining ? (
              <View style={{ gap: spacing.sm }}>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="যেমন: স্টকে নেই"
                  placeholderTextColor={colors.secondary}
                  value={declineReason}
                  onChangeText={onDeclineReason}
                  multiline
                  maxLength={500}
                />
                <View style={styles.actionRow}>
                  <Button label="ফেরান" variant="danger" onPress={onSubmitDecline} loading={busy} style={{ flex: 1 }} />
                  <Button label="বাতিল" variant="secondary" onPress={onCancelDecline} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <View style={styles.actionRow}>
                <Button label="গ্রহণ করুন" onPress={onAccept} loading={busy} style={{ flex: 1 }} />
                <Button label="ফেরান" variant="secondary" onPress={onStartDecline} style={{ flex: 1 }} />
              </View>
            )
          ) : order.stallResponse === 'DECLINED' ? (
            <Text style={styles.meta}>ফেরানো অর্ডারের স্ট্যাটাস বদলানো যায় না।</Text>
          ) : (
            <>
              <Text style={styles.sectionLabel}>স্ট্যাটাস বদলান</Text>
              {busy ? <ActivityIndicator color={colors.navy} /> : null}
              <ChipRow>
                {NEXT_STATUSES.map((s) => (
                  <Chip
                    key={s}
                    label={ORDER_STATUS_BN[s]}
                    active={order.status === s}
                    tone={s === 'CANCELLED' ? 'danger' : 'navy'}
                    onPress={() => onStatus(s)}
                  />
                ))}
              </ChipRow>
            </>
          )}
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
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  headLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  itemRow: { gap: 2 },
  itemTitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.heading },
  itemMeta: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
  warn: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.warning },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 70,
    textAlignVertical: 'top',
    fontFamily: fonts.sansRegular,
    fontSize: 14,
    color: colors.heading,
    backgroundColor: colors.white,
  },
  endLine: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary, textAlign: 'center', marginVertical: spacing.lg },
})
