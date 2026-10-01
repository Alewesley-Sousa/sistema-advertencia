// src/renderer/features/infracoes/components/InfracoesMetricas.tsx

interface InfracoesMetricasProps {
  pendentes: number
  processando: number
  enviadas: number
  erros: number
}

export function InfracoesMetricas({
  pendentes,
  processando,
  enviadas,
  erros,
}: InfracoesMetricasProps) {
  return (
    <div className="flex items-center gap-5">
      <Metrica cor="amber" label="Pendentes" valor={pendentes} />
      <Metrica cor="petrol" label="Processando" valor={processando} />
      <Metrica cor="emerald" label="Enviadas · mês" valor={enviadas} />
      <Metrica cor="rose" label="Erros" valor={erros} />
    </div>
  )
}

function Metrica({
  cor,
  label,
  valor,
}: {
  cor: 'amber' | 'petrol' | 'emerald' | 'rose'
  label: string
  valor: number
}) {
  const cores: Record<string, string> = {
    amber: 'bg-amber-500',
    petrol: 'bg-petrol-600 dark:bg-petrol-400',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full transition-colors ${cores[cor]}`} />
      <span className="text-slate-500 dark:text-petrol-300/70 transition-colors">
        {label}
      </span>
      <span className="text-slate-800 dark:text-white font-bold mono transition-colors">
        {valor}
      </span>
    </div>
  )
}