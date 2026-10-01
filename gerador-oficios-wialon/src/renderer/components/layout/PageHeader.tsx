// src/renderer/components/layout/PageHeader.tsx

import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow: string
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
      <div>
        <div className="text-[10px] font-bold text-petrol-700 dark:text-petrol-300 tracking-[0.18em] uppercase mb-2 transition-colors">
          {eyebrow}
        </div>
        <h1 className="text-[26px] font-bold text-slate-900 dark:text-white tracking-tight leading-none transition-colors">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13.5px] text-slate-500 dark:text-petrol-300/60 mt-2 max-w-2xl transition-colors">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}