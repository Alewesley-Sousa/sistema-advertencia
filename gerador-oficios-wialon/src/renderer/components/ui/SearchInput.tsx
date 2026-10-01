// src/renderer/components/ui/SearchInput.tsx

import { Search, Loader2 } from 'lucide-react'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  loading?: boolean
}

export function SearchInput({ loading = false, className = '', ...props }: SearchInputProps) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-petrol-300/50 transition-colors" />
      <input
        {...props}
        className={`
          w-full pl-10 pr-10 py-2 rounded-xl text-sm transition-colors
          bg-slate-50 dark:bg-petrol-900
          border border-slate-200 dark:border-petrol-800
          text-slate-800 dark:text-petrol-100
          placeholder:text-slate-400 dark:placeholder:text-petrol-300/40
          focus:outline-none focus:ring-2
          focus:ring-petrol-600/40 dark:focus:ring-petrol-400/40
          ${className}
        `}
      />
      {loading && (
        <div className="absolute right-3.5 top-2.5">
          <Loader2 className="w-5 h-5 animate-spin text-petrol-600 dark:text-petrol-300 transition-colors" />
        </div>
      )}
    </div>
  )
}