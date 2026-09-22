import { useMemo, useState } from 'react'
import {
  ShieldAlert,
  RefreshCw,
  FileText,
  History,
} from 'lucide-react'
import type { Infracao } from '../services/infracoes'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { SearchInput } from '../components/ui/SearchInput'
import { Pagination } from '../components/ui/Pagination'

import { InfracaoTable } from '../features/infracoes/components/InfracaoTable'
import { InfracaoHistoricoFilters } from '../features/infracoes/components/InfracaoHistoricoFilters'
import { useInfracoesHistorico } from '../features/infracoes/hooks/useInfracoesHistorico'
import { useInfracoesOrdenacao } from '../features/infracoes/hooks/useInfracoesOrdenacao'
import { useGerarPdfInfracao } from '../features/infracoes/hooks/useGerarPdfInfracao'
import { useSincronizarWialon } from '../features/infracoes/hooks/useSincronizarWialon'

interface InfracoesPageProps {
  infracoesLocais: Infracao[]
  loadingPdfId: number | null
  gerandoPdfId?: number | null
  enviandoEmailId: number | null
  onAbrirPdf: (id: number, placa: string, condutor: string) => void
  onGerarPdf?: (id: number) => void
  onEnviarEmail: (id: number) => void
  onAtualizarStatus: () => void
}

export function InfracoesPage({
  infracoesLocais,
  loadingPdfId,
  gerandoPdfId: gerandoPdfIdProp,
  enviandoEmailId,
  onAbrirPdf,
  onGerarPdf,
  onEnviarEmail,
  onAtualizarStatus,
}: InfracoesPageProps) {
  // ---- Estado de UI ----
  const [abaAtiva, setAbaAtiva] = useState<'OPERACIONAL' | 'HISTORICO'>('OPERACIONAL')
  const [filtroOperacional, setFiltroOperacional] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')

  // ---- Hooks de domínio ----
  const {
    data: historicoData,
    busca: buscaHistorico,
    dataInicio,
    dataFim,
    loading: loadingHistorico,
    setDataInicio,
    setDataFim,
    setPagina: setPaginaHistorico,
    handleBuscaChange: handleBuscaHistoricoChange,
    carregarHistorico,
  } = useInfracoesHistorico(abaAtiva)

  const { campoOrdenacao, direcaoOrdenacao, handleOrdenar, ordenarLista } =
    useInfracoesOrdenacao()

  const { gerarPdf, gerandoPdfId } = useGerarPdfInfracao({
    onGerarPdfExterno: onGerarPdf,
    gerandoPdfIdExterno: gerandoPdfIdProp,
    onSucesso: () => {
      onAtualizarStatus()
      if (abaAtiva === 'HISTORICO') carregarHistorico()
    },
  })

  const { sincronizar, sincronizando } = useSincronizarWialon(onAtualizarStatus)

  // ---- Listas derivadas ----
  const infracoesSeguras: Infracao[] = Array.isArray(infracoesLocais) ? infracoesLocais : []
  const historicoLista: Infracao[] = Array.isArray(historicoData?.data) ? historicoData.data : []

  const infracoesOperacionais = useMemo(() => {
    const termo = filtroOperacional.toLowerCase().trim()
    const filtradas = infracoesSeguras.filter(
      (item) =>
        !termo ||
        (item.condutor || '').toLowerCase().includes(termo) ||
        (item.placa || '').toLowerCase().includes(termo) ||
        String(item.id ?? '').includes(termo)
    )
    return ordenarLista(filtradas)
  }, [infracoesSeguras, filtroOperacional, ordenarLista])

  const historicoOrdenado = useMemo(() => {
    const filtrados = historicoLista.filter((item) => {
      const statusItem = (item as any).status || (item as any).status_envio || ''
      return filtroStatus === 'TODOS' || statusItem === filtroStatus
    })
    return ordenarLista(filtrados)
  }, [historicoLista, filtroStatus, ordenarLista])

  const limparFiltroData = () => {
    setDataInicio('')
    setDataFim('')
  }

  return (
    <div className="space-y-6">
      {/* ===== Cabeçalho ===== */}
      <Card className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-rose-600" />
            Gestão de Infrações
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhamento em tempo real e consulta ao histórico completo de autuações.
          </p>
        </div>

        <Button variant="secondary" onClick={sincronizar} loading={sincronizando}>
          {!sincronizando && <RefreshCw className="w-4 h-4" />}
          {sincronizando ? 'Sincronizando...' : 'Sincronizar Dados'}
        </Button>
      </Card>

      {/* ===== Abas ===== */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setAbaAtiva('OPERACIONAL')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition cursor-pointer ${abaAtiva === 'OPERACIONAL'
              ? 'border-cyan-600 text-cyan-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <FileText className="w-4 h-4" />
          Operacional ({infracoesSeguras.length})
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('HISTORICO')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition cursor-pointer ${abaAtiva === 'HISTORICO'
              ? 'border-cyan-600 text-cyan-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <History className="w-4 h-4" />
          Histórico Geral
        </button>
      </div>

      {/* ===== ABA OPERACIONAL ===== */}
      {abaAtiva === 'OPERACIONAL' && (
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <SearchInput
              placeholder="Filtrar por condutor, placa ou ID..."
              value={filtroOperacional}
              onChange={(e) => setFiltroOperacional(e.target.value)}
            />
          </div>

          <InfracaoTable
            lista={infracoesOperacionais}
            emptyMessage="Nenhuma infração operacional encontrada."
            campoOrdenacao={campoOrdenacao}
            direcaoOrdenacao={direcaoOrdenacao}
            onOrdenar={handleOrdenar}
            onAbrirPdf={onAbrirPdf}
            onGerarPdf={gerarPdf}
            onEnviarEmail={onEnviarEmail}
            loadingPdfId={loadingPdfId}
            gerandoPdfId={gerandoPdfId}
            enviandoEmailId={enviandoEmailId}
          />
        </Card>
      )}

      {/* ===== ABA HISTÓRICO ===== */}
      {abaAtiva === 'HISTORICO' && (
        <Card padding="none" className="overflow-hidden">
          <InfracaoHistoricoFilters
            busca={buscaHistorico}
            onBuscaChange={handleBuscaHistoricoChange}
            loadingBusca={loadingHistorico}
            filtroStatus={filtroStatus}
            onFiltroStatusChange={setFiltroStatus}
            dataInicio={dataInicio}
            dataFim={dataFim}
            onDataInicioChange={setDataInicio}
            onDataFimChange={setDataFim}
            onLimparDatas={limparFiltroData}
          />

          <InfracaoTable
            lista={historicoOrdenado}
            loading={loadingHistorico}
            loadingMessage="Carregando histórico..."
            emptyMessage="Nenhum registro encontrado no histórico."
            campoOrdenacao={campoOrdenacao}
            direcaoOrdenacao={direcaoOrdenacao}
            onOrdenar={handleOrdenar}
            onAbrirPdf={onAbrirPdf}
            onGerarPdf={gerarPdf}
            onEnviarEmail={onEnviarEmail}
            loadingPdfId={loadingPdfId}
            gerandoPdfId={gerandoPdfId}
            enviandoEmailId={enviandoEmailId}
          />

          {historicoData?.meta && (
            <Pagination
              page={historicoData.meta.page ?? 1}
              totalPages={historicoData.meta.totalPages ?? 1}
              total={historicoData.meta.totalItems ?? 0}
              onPageChange={setPaginaHistorico}
            />
          )}
        </Card>
      )}
    </div>
  )
}