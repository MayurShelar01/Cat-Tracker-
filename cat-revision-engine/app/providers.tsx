"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { isSupabase } from '@/lib/db'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-bg-tertiary text-xs text-center py-1 font-mono sticky top-0 z-50 shadow-sm border-b border-white/5">
          {isSupabase ? "🟢 DB: Supabase" : "🟡 DB: localStorage"}
        </div>
      )}
      {children}
    </QueryClientProvider>
  )
}
