import React from 'react'
import { Redirect } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { LoadingView } from '@/components/States'

export default function Index() {
  const { status, persona, needsPersonaChoice } = useAuth()

  if (status === 'loading') return <LoadingView />
  if (status === 'signedOut') return <Redirect href="/login" />
  if (needsPersonaChoice) return <Redirect href="/persona-switcher" />

  if (persona?.kind === 'platform-admin') return <Redirect href="/(platform-admin)/dashboard" />
  if (persona?.kind === 'stall') return <Redirect href="/(stall-admin)/dashboard" />

  return <LoadingView />
}
