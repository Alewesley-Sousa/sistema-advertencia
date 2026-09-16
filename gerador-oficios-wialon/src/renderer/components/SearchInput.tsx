// components/SearchInput.tsx
import { Search, Loader2 } from 'lucide-react'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  loading?: boolean
}

export function SearchInput({ loading = false, className = '', ...props }: SearchInputProps) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
      <input
        {...props}
        className={`w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${className}`}
      />
      {loading && (
        <div className="absolute right-3.5 top-2.5">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
        </div>
      )}
    </div>
  )
}