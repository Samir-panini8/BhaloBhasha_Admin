import React, { useCallback } from 'react'
import { View, Text, StyleSheet, Alert, Image } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { ScreenHeader } from '@/components/ScreenHeader'
import { ListRow } from '@/components/ListRow'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { useAuth } from '@/lib/auth-context'
import { colors, fonts, spacing } from '@/lib/theme'

const ORG_TYPE_BN: Record<string, string> = {
  PUBLISHER: 'প্রকাশনা স্টল',
  SELLER: 'বিক্রেতা স্টল',
  PUBLISHER_AND_SELLER: 'প্রকাশনা ও বিক্রয় স্টল',
  ARTIST: 'শিল্পী স্টল (রঙ্গ)',
  ARTISAN: 'কারিগর স্টল (সোনাঝুরি)',
}

export default function StallMoreScreen() {
  const router = useRouter()
  const { user, persona, orgMemberships, signOut, refreshOrganizations } = useAuth()

  // The stall list is loaded once at sign-in; without this, a stall renamed
  // on the website (or on the profile screen below) kept its old name here
  // until the app was restarted.
  useFocusEffect(
    useCallback(() => {
      refreshOrganizations()
    }, [refreshOrganizations])
  )

  const current = persona?.kind === 'stall' ? orgMemberships.find((m) => m.organization.id === persona.orgId) : undefined
  const hasOtherPersonas = orgMemberships.length > 1 || (user?.roles.includes('ADMIN') ?? false)

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <ScreenHeader title="আরও" />
      <View style={styles.profile}>
        {current?.organization.logoUrl ? (
          <Image source={{ uri: current.organization.logoUrl }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={styles.avatar}>
            <Ionicons name="storefront" size={26} color={colors.white} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{current?.organization.nameBn ?? 'স্টল'}</Text>
          <Text style={styles.role}>{current ? ORG_TYPE_BN[current.organization.type] ?? current.organization.type : ''}</Text>
        </View>
        {current ? <Badge label={current.role} tone="navy" /> : null}
      </View>

      <Card style={{ padding: 0, margin: spacing.lg }}>
        <ListRow
          title="স্টল প্রোফাইল"
          subtitle="নাম, পরিচিতি, লোগো, যোগাযোগ, পিন কোড ও জিএসটিআইএন"
          onPress={() => router.push('/stall-profile')}
        />
        <ListRow title="সাইন ইন ব্যক্তি" subtitle={user?.nameBn || user?.phone || ''} />
        {hasOtherPersonas ? (
          <ListRow title="ভূমিকা পরিবর্তন করুন" subtitle="অন্য স্টল বা প্ল্যাটফর্ম অ্যাডমিন" onPress={() => router.push('/persona-switcher')} />
        ) : null}
      </Card>

      <Card style={{ margin: spacing.lg, marginTop: 0 }}>
        <ListRow
          title="সাইন আউট"
          onPress={() =>
            Alert.alert('সাইন আউট', 'আপনি কি নিশ্চিতভাবে সাইন আউট করতে চান?', [
              { text: 'বাতিল', style: 'cancel' },
              { text: 'সাইন আউট', style: 'destructive', onPress: signOut },
            ])
          }
        />
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.heading },
  role: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary },
})
