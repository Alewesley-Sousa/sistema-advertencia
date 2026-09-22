// src/renderer/features/detran/components/DetranForm.tsx

import type { FormEvent } from 'react'
import { Search } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { normalizarPlaca, normalizarChassi } from '../utils'

interface DetranFormProps {
  placa: string
  chassi: string
  onPlacaChange: (v: string) => void
  onChassiChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  loading?: boolean
  disabled?: boolean
}

const inputClass = cn(
  'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm uppercase',
  'focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20',
  'disabled:opacity-50 disabled:cursor-not-allowed'
)

export function DetranForm({
  placa,
  chassi,
  onPlacaChange,
  onChassiChange,
  onSubmit,
  loading,
  disabled,
}: DetranFormProps) {
  return (
    <Card>
      <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Search className="w-4 h-4 text-cyan-600" />
        Consulta Avulsa de 1 Veículo (Teste Rápido)
      </h2>

      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Placa
          </label>
          <input
            type="text"
            placeholder="Ex: NUZ1234"
            value={placa}
            onChange={(e) => onPlacaChange(normalizarPlaca(e.target.value))}
            className={inputClass}
            disabled={disabled}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Chassi ou RENAVAM
          </label>
          <input
            type="text"
            placeholder="Ex: 9BW..."
            value={chassi}
            onChange={(e) => onChassiChange(normalizarChassi(e.target.value))}
            className={inputClass}
            disabled={disabled}
            required
          />
        </div>

        <div className="flex items-end">
          <Button
            type="submit"
            className="w-full bg-blue-900 hover:bg-blue-950 text-white"
            loading={loading}
            disabled={disabled || !placa || !chassi}
          >
            {!loading && <Search className="w-4 h-4" />}
            {loading ? 'Consultando...' : 'Consultar no DETRAN'}
          </Button>
        </div>
      </form>
    </Card>
  )
}