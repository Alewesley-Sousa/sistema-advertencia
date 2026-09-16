import { LayoutDashboard, Settings, RefreshCw } from 'lucide-react'
import logoForce from '../../assets/logo-force2.png'

interface HeaderProps {
  abaAtiva: 'infracoes' | 'configuracoes'
  setAbaAtiva: (aba: 'infracoes' | 'configuracoes') => void
  onRefresh: () => void
  loading: boolean
}

export function Header({ abaAtiva, setAbaAtiva, onRefresh, loading }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 text-white shadow-lg px-8 py-4 flex flex-col md:flex-row justify-between items-center border-b border-cyan-500/20 gap-4">
      <div className="flex items-center gap-4">
        {/* Logo Force Logística ajustada com invert para contraste no fundo escuro */}
        <div className="flex items-center justify-center p-1.5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
          <img 
            src={logoForce} 
            alt="Logo Force Logística" 
            className="h-9 w-auto object-contain brightness-0 invert" 
          />
        </div>

        <div className="h-8 w-[1px] bg-cyan-500/20 hidden sm:block" />

        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Gestão de Frotas & Ofícios <span className="text-cyan-400 font-normal">Wialon</span>
          </h1>
          <p className="text-xs text-blue-200/70">Painel de Monitoramento de Excesso de Velocidade e Automação</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex bg-blue-900/60 p-1 rounded-xl border border-cyan-500/20">
          <button
            onClick={() => setAbaAtiva('infracoes')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              abaAtiva === 'infracoes' ? 'bg-cyan-500 text-blue-950 font-bold shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Infrações
          </button>
          <button
            onClick={() => setAbaAtiva('configuracoes')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              abaAtiva === 'configuracoes' ? 'bg-cyan-500 text-blue-950 font-bold shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Configurações
          </button>
        </div>
      </div>
    </header>
  )
}