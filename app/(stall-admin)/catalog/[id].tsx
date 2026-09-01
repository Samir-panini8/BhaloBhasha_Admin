import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { ProductForm } from '@/components/ProductForm'
import { ErrorState } from '@/components/States'

export default function EditProduct() {
  const { id } = useLocalSearchParams<{ id: string }>()
  if (!id) return <ErrorState message="পণ্যটি পাওয়া যায়নি" />
  return <ProductForm editionId={id} />
}
