// apps/detran/src/renderer/components/layout/MainLayout.tsx

import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-petrol-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased transition-colors">
      <Header />

      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  )
}
