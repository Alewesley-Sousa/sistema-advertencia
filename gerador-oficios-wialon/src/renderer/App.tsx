import { useState } from 'react'
import { StatusBadge } from '@/renderer/components/StatusBadge'
import type { Infracao } from '@/shared/types'

function App() {
  const [count, setCount] = useState(0)

  // Dados mockados utilizando a interface compartilhada
  const infracaoTeste: Infracao = {
    id: 1,
    placa: 'HWU-9900',
    velocidade: 88,
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-8 flex flex-col items-center justify-center space-y-6">
      <div className="flex items-center gap-3 text-brand-500 font-semibold text-sm tracking-wider uppercase">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse"></span>
        Tailwind v4 Test Zone
      </div>

      <h1 className="text-4xl font-bold tracking-tight text-white">
        Gerador de Ofícios Wialon
      </h1>

      <p className="text-slate-400 max-w-md text-center">
        Se este card estiver estilizado em escuro com detalhes em azul customizado, a configuração do Tailwind v4 funcionou.
      </p>

      {/* Teste do Path Alias importando o componente */}
      <StatusBadge infracao={infracaoTeste} />

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 flex flex-col items-center space-y-4 shadow-lg">
        <span className="font-mono text-brand-500 text-xs px-3 py-1 bg-brand-500/10 rounded-full border border-brand-500/20">
          FONTE MONO: JetBrains Mono
        </span>

        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-900 text-white font-medium rounded-lg transition cursor-pointer shadow-md"
        >
          Contador: <span className="font-mono font-bold ml-1">{count}</span>
        </button>
      </div>
    </div>
  )
}

export default App