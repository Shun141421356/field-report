'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function Root() {
  const { user, loading } = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (loading) return
    router.replace(user ? '/reports' : '/login')
  }, [user, loading, router])
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 24, height: 24, border: '2px solid #d8d4cc', borderTopColor: '#1a1916', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
