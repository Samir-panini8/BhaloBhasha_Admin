import React, { useState } from 'react'
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { uploadAsset, ApiError } from '@/lib/api'
import { colors, fonts, radius, spacing } from '@/lib/theme'

const MAX_GALLERY = 8

// The bucket rejects anything but these, and the server caps images at 10MB.
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 10 * 1024 * 1024

async function pick(multiple: boolean): Promise<ImagePicker.ImagePickerAsset[] | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    Alert.alert('অনুমতি প্রয়োজন', 'ছবি বাছতে গ্যালারির অনুমতি দিন — সেটিংস থেকে চালু করা যায়।')
    return null
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? MAX_GALLERY : 1,
    quality: 0.85,
    // The server stores whatever it is handed, so shrink on the device rather
    // than pushing 12MB phone camera originals over a stall's mobile data.
    exif: false,
  })
  if (result.canceled) return null
  return result.assets
}

function assetToFile(asset: ImagePicker.ImagePickerAsset, index: number) {
  // Never guess: calling a HEIC "image/jpeg" makes the upload fail on the
  // server with a confusing error instead of here with a clear one.
  const type = asset.mimeType ?? 'image/jpeg'
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : type === 'image/gif' ? 'gif' : 'jpg'
  const name = asset.fileName ?? `upload-${Date.now()}-${index}.${ext}`
  return { uri: asset.uri, name, type }
}

function unsupported(asset: ImagePicker.ImagePickerAsset): boolean {
  return !!asset.mimeType && !ALLOWED.includes(asset.mimeType)
}

function tooBig(asset: ImagePicker.ImagePickerAsset): boolean {
  return typeof asset.fileSize === 'number' && asset.fileSize > MAX_BYTES
}

function reportError(err: unknown) {
  Alert.alert('আপলোড ব্যর্থ', err instanceof ApiError ? err.message : 'ছবি আপলোড করা যায়নি — আবার চেষ্টা করুন')
}

export function CoverUpload({
  value,
  onChange,
  folder = 'book-covers',
  label = 'কভার ছবি',
  hint,
}: {
  value: string | null
  onChange: (url: string | null) => void
  folder?: string
  label?: string
  hint?: string
}) {
  const [busy, setBusy] = useState(false)

  async function handlePick() {
    const assets = await pick(false)
    if (!assets?.length) return
    const asset = assets[0]
    if (unsupported(asset)) {
      Alert.alert('ছবির ধরন সমর্থিত নয়', 'JPEG, PNG, WebP বা GIF ছবি বাছুন (আইফোনের HEIC হলে ছবিটি একবার সম্পাদনা করে সেভ করুন)।')
      return
    }
    if (tooBig(asset)) {
      Alert.alert('ছবিটি বড়', 'ছবির আকার ১০ এমবি-র কম হতে হবে।')
      return
    }
    setBusy(true)
    try {
      onChange(await uploadAsset(assetToFile(asset, 0), folder))
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.coverRow}>
        <Pressable onPress={handlePick} disabled={busy} style={styles.coverBox}>
          {busy ? (
            <ActivityIndicator color={colors.navy} />
          ) : value ? (
            <Image source={{ uri: value }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="image-outline" size={26} color={colors.secondary} />
              <Text style={styles.pickLabel}>ছবি বাছুন</Text>
            </>
          )}
        </Pressable>
        <View style={{ flex: 1, gap: spacing.sm }}>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          <Pressable onPress={handlePick} disabled={busy}>
            <Text style={styles.action}>{value ? 'ছবি বদলান' : 'গ্যালারি থেকে বাছুন'}</Text>
          </Pressable>
          {value ? (
            <Pressable onPress={() => onChange(null)} disabled={busy}>
              <Text style={[styles.action, { color: colors.error }]}>সরান</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  )
}

export function GalleryUpload({
  value,
  onChange,
  folder = 'book-covers',
  label = 'আরও ছবি',
}: {
  value: string[]
  onChange: (urls: string[]) => void
  folder?: string
  label?: string
}) {
  const [busy, setBusy] = useState(false)
  const remaining = MAX_GALLERY - value.length

  async function handlePick() {
    if (remaining <= 0) {
      Alert.alert('সীমা পূর্ণ', `সর্বোচ্চ ${MAX_GALLERY}টি ছবি যোগ করা যায়।`)
      return
    }
    const assets = await pick(true)
    if (!assets?.length) return
    const usable = assets.filter((a) => !tooBig(a) && !unsupported(a)).slice(0, remaining)
    if (usable.length < assets.length) {
      Alert.alert('কিছু ছবি বাদ গেছে', '১০ এমবি-র বেশি, অসমর্থিত ধরনের, বা সীমার অতিরিক্ত ছবি বাদ দেওয়া হয়েছে।')
    }
    if (!usable.length) return
    setBusy(true)
    try {
      // Sequential on purpose: a stall on 3G uploading eight covers at once
      // times most of them out.
      const uploaded: string[] = []
      for (let i = 0; i < usable.length; i++) {
        uploaded.push(await uploadAsset(assetToFile(usable[i], i), folder))
      }
      onChange([...value, ...uploaded])
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>
        {label} ({value.length}/{MAX_GALLERY})
      </Text>
      <View style={styles.galleryRow}>
        {value.map((url) => (
          <View key={url} style={styles.thumbWrap}>
            <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
            <Pressable
              onPress={() => onChange(value.filter((u) => u !== url))}
              hitSlop={8}
              style={styles.thumbRemove}
            >
              <Ionicons name="close" size={13} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {remaining > 0 ? (
          <Pressable onPress={handlePick} disabled={busy} style={[styles.thumb, styles.thumbAdd]}>
            {busy ? <ActivityIndicator color={colors.navy} /> : <Ionicons name="add" size={22} color={colors.navy} />}
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.secondary },
  hint: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
  action: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.navy },
  coverRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  coverBox: {
    width: 90,
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
    backgroundColor: colors.parchment,
  },
  coverImage: { width: '100%', height: '100%' },
  pickLabel: { fontFamily: fonts.sansRegular, fontSize: 11, color: colors.secondary },
  galleryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.parchment,
  },
  thumbAdd: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
