
interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    GERADO: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    PENDENTE: 'bg-amber-50 text-amber-700 border-amber-200/60',
    ERRO: 'bg-rose-50 text-rose-700 border-rose-200/60',
  }[status] || 'bg-slate-50 text-slate-700 border-slate-200'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      {status}
    </span>
  )
}