import React from 'react'
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-context'
import { colors, fonts, radius, spacing } from '@/lib/theme'
import type { Persona } from '@/lib/types'

const ORG_TYPE_LABEL: Record<string, string> = {
  PUBLISHER: 'প্রকাশনা স্টল',
  SELLER: 'বিক্রেতা স্টল',
  PUBLISHER_AND_SELLER: 'প্রকাশনা ও বিক্রয় স্টল',
  ARTIST: 'শিল্পী স্টল (রঙ্গ)',
  ARTISAN: 'কারিগর স্টল (সোনাঝুরি)',
}

export default function PersonaSwitcher() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user, orgMemberships, choosePersona } = useAuth()

  const isAdmin = user?.roles.includes('ADMIN') ?? false

  async function select(persona: Persona) {
    await choosePersona(persona)
    router.replace('/')
  }

  const items: Array<{ persona: Persona; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }> = [
    ...(isAdmin
      ? [{ persona: { kind: 'platform-admin' } as const, title: 'প্ল্যাটফর্ম অ্যাডমিন', subtitle: 'পুরো Fair Bengal প্ল্যাটফর্ম পরিচালনা', icon: 'shield-checkmark' as const }]
      : []),
    ...orgMemberships.map((m) => ({
      persona: { kind: 'stall' as const, orgId: m.organization.id },
      title: m.organization.nameBn,
      subtitle: `${ORG_TYPE_LABEL[m.organization.type] ?? m.organization.type} · ${m.role}`,
      icon: 'storefront' as const,
    })),
  ]

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.xl }]}>
      <Text style={styles.title}>কোন হিসেবে ঢুকবেন?</Text>
      <Text style={styles.subtitle}>আপনার একাধিক ভূমিকা আছে — একটি বেছে নিন, পরে যেকোনো সময় বদলাতে পারবেন</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => (item.persona.kind === 'platform-admin' ? 'platform-admin' : item.persona.orgId)}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => select(item.persona)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={22} color={colors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
          </Pressable>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.parchment, paddingHorizontal: spacing.xl },
  title: { fontFamily: fonts.serifBold, fontSize: 24, color: colors.heading },
  subtitle: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardPressed: { backgroundColor: colors.navyMist },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navyMist, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.heading },
  cardSubtitle: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary, marginTop: 2 },
})
