import React from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { ListRow } from '@/components/ListRow'
import { Card } from '@/components/Card'
import { useAuth } from '@/lib/auth-context'
import { colors, fonts, spacing } from '@/lib/theme'

export default function MoreScreen() {
  const router = useRouter()
  const { user, signOut, orgMemberships } = useAuth()

  const hasMultiplePersonas = orgMemberships.length > 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Ionicons name="shield-checkmark" size={28} color={colors.white} />
        </View>
        <View>
          <Text style={styles.name}>{user?.nameBn || 'অ্যাডমিন'}</Text>
          <Text style={styles.role}>প্ল্যাটফর্ম অ্যাডমিন</Text>
        </View>
      </View>

      <Card style={{ padding: 0, margin: spacing.lg }}>
        <ListRow title="ব্যবহারকারী ব্যবস্থাপনা" subtitle="খুঁজুন, রোল দিন, স্থগিত করুন" onPress={() => router.push('/(platform-admin)/more/users')} />
        {hasMultiplePersonas ? (
          <ListRow title="ভূমিকা পরিবর্তন করুন" subtitle="প্ল্যাটফর্ম অ্যাডমিন ⇄ স্টল অ্যাডমিন" onPress={() => router.push('/persona-switcher')} />
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
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.heading },
  role: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary },
})
