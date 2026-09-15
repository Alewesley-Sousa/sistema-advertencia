import { type Infracao } from '@/shared/types'

interface Props {
  infracao: Infracao
}

export function StatusBadge({ infracao }: Props) {
  return (
    <div className="p-3 bg-slate-800 text-brand-500 rounded-lg border border-slate-700 font-mono text-sm">
      [ALIAS OK] Placa: {infracao.placa} - {infracao.velocidade} km/h
    </div>
  )
}