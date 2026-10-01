// src/renderer/components/layout/MainLayout.tsx

import { Outlet } from 'react-router-dom'
import { Header, type InfracoesAba } from './Header'

interface MainLayoutProps {
  loading: boolean
  onRefresh: () => void
  infracoesAba: InfracoesAba
  onInfracoesAbaChange: (aba: InfracoesAba) => void
  wialonConectado?: boolean
}

export function MainLayout({
  loading,
  onRefresh,
  infracoesAba,
  onInfracoesAbaChange,
  wialonConectado = true,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-petrol-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased transition-colors">
      <Header
        loading={loading}
        onRefresh={onRefresh}
        infracoesAba={infracoesAba}
        onInfracoesAbaChange={onInfracoesAbaChange}
        wialonConectado={wialonConectado}
      />

      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  )
}