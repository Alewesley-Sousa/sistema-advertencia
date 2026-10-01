// src/renderer/components/ui/StatusBadge.tsx

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    GERADO: [
      'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      'dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
    ].join(' '),
    PENDENTE: [
      'bg-amber-50 text-amber-700 border-amber-200/60',
      'dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
    ].join(' '),
    ERRO: [
      'bg-rose-50 text-rose-700 border-rose-200/60',
      'dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
    ].join(' '),
  }[status] || [
    'bg-slate-50 text-slate-700 border-slate-200',
    'dark:bg-petrol-900 dark:text-petrol-300/70 dark:border-petrol-800',
  ].join(' ')

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${styles}`}
    >
      {status}
    </span>
  )
}