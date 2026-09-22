import { Outlet } from 'react-router-dom'
import { Header } from './Header'

interface MainLayoutProps {
  loading: boolean
  onRefresh: () => void
}

export function MainLayout({ loading, onRefresh }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* Passando o loading e o onRefresh para o Header */}
      <Header loading={loading} onRefresh={onRefresh} />
      
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}