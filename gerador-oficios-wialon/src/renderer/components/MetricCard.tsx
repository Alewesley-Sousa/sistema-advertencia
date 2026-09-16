import { type ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: number
  icon: ReactNode
  variant?: 'blue' | 'emerald' | 'rose'
}

export function MetricCard({ title, value, icon, variant = 'blue' }: MetricCardProps) {
  const colorMap = {
    blue: {
      text: 'text-blue-950',
      border: 'hover:border-cyan-500/40',
      bgIcon: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    },
    emerald: {
      text: 'text-emerald-600',
      border: 'hover:border-emerald-500/40',
      bgIcon: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    rose: {
      text: 'text-rose-600',
      border: 'hover:border-rose-500/40',
      bgIcon: 'bg-rose-50 text-rose-600 border-rose-100',
    },
  }[variant]

  return (
    <div className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between ${colorMap.border} transition`}>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className={`text-3xl font-extrabold mt-1 ${colorMap.text}`}>{value}</h3>
      </div>
      <div className={`p-3 rounded-xl border ${colorMap.bgIcon}`}>
        {icon}
      </div>
    </div>
  )
}