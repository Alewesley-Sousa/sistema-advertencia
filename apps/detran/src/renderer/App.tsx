// apps/detran/src/renderer/App.tsx

import { Routes, Route, Navigate } from 'react-router-dom'
import { NotFoundPage, Toaster } from '@force/shared/web'
import { MainLayout } from './components/layout/MainLayout'
import { ConsultaDetranPage } from './pages/ConsultaDetranPage'

export function App() {
  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans relative antialiased">
      <Toaster />

      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/detran" replace />} />
          <Route path="/detran" element={<ConsultaDetranPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App
