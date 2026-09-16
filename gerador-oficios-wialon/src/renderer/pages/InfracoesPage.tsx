import { useState } from 'react'
import { ShieldAlert, RefreshCw, FileText, History, Calendar, Loader2 } from 'lucide-react'
import { type Infracao, sincronizarDadosWialon } from '../services/api'

// Importação dos componentes isolados
import { InfracaoTableRow } from '../components/InfracaoTableRow'
import { SearchInput } from '../components/SearchInput'
import { Pagination } from '../components/Pagination'

// Importação do custom hook
import { useInfracoesHistorico } from '../hooks/useInfracoesHistorico'

interface InfracoesPageProps {
  infracoesLocais: Infracao[]
  loadingPdfId: number | null
  enviandoEmailId: number | null
  onAbrirPdf: (id: number, placa: string, condutor: string) => void
  onEnviarEmail: (id: number) => void
  onAtualizarStatus: () => void
}

export function InfracoesPage({
  infracoesLocais,
  loadingPdfId,
  enviandoEmailId,
  onAbrirPdf,
  onEnviarEmail,
  onAtualizarStatus
}: InfracoesPageProps) {
  const [abaAtiva, setAbaAtiva] = useState<'OPERACIONAL' | 'HISTORICO'>('OPERACIONAL')
  const [filtroOperacional, setFiltroOperacional] = useState('')
  const [sincronizando, setSincronizando] = useState(false)

  // Custom hook trazendo também os estados e setters de data
  const {
    data: historicoData,
    busca: buscaHistorico,
    dataInicio,
    dataFim,
    loading: loadingHistorico,
    setDataInicio,
    setDataFim,
    setPagina: setPaginaHistorico,
    handleBuscaChange: handleBuscaHistoricoChange
  } = useInfracoesHistorico(abaAtiva)

  // Handler para acionar a sincronização ativa via API
  const handleSincronizar = async () => {
    try {
      setSincronizando(true)
      await sincronizarDadosWialon()
      // Atualiza os dados da interface
      onAtualizarStatus()
    } catch (error) {
      console.error('[InfracoesPage] Falha ao sincronizar dados com a Wialon:', error)
    } finally {
      setSincronizando(false)
    }
  }

  // Filtro local simples para a aba Operacional
  const infracoesOperacionaisFiltradas = infracoesLocais.filter(item => {
    const termo = filtroOperacional.toLowerCase()
    return (
      item.condutor.toLowerCase().includes(termo) ||
      item.placa.toLowerCase().includes(termo) ||
      item.id.toString().includes(termo)
    )
  })

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-rose-600" />
            Gestão de Infrações
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhamento em tempo real e consulta ao histórico completo de autuações.
          </p>
        </div>

        <button
          onClick={handleSincronizar}
          disabled={sincronizando}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition border border-slate-200 disabled:opacity-50"
        >
          {sincronizando ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {sincronizando ? 'Sincronizando...' : 'Sincronizar Dados'}
        </button>
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setAbaAtiva('OPERACIONAL')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition ${
            abaAtiva === 'OPERACIONAL'
              ? 'border-cyan-600 text-cyan-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Operacional ({infracoesLocais.length})
        </button>

        <button
          onClick={() => setAbaAtiva('HISTORICO')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition ${
            abaAtiva === 'HISTORICO'
              ? 'border-cyan-600 text-cyan-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Histórico Geral
        </button>
      </div>

      {/* CONTEÚDO DA ABA OPERACIONAL */}
      {abaAtiva === 'OPERACIONAL' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <SearchInput
              placeholder="Filtrar por condutor, placa ou ID..."
              value={filtroOperacional}
              onChange={(e) => setFiltroOperacional(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-5">ID / Data</th>
                  <th className="py-3 px-5">Condutor / Placa</th>
                  <th className="py-3 px-5">Velocidade</th>
                  <th className="py-3 px-5">Endereço</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {infracoesOperacionaisFiltradas.length > 0 ? (
                  infracoesOperacionaisFiltradas.map((item) => (
                    <InfracaoTableRow
                      key={item.id}
                      item={item}
                      onAbrirPdf={onAbrirPdf}
                      onEnviarEmail={onEnviarEmail}
                      loadingPdfId={loadingPdfId}
                      enviandoEmailId={enviandoEmailId}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Nenhuma infração operacional encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA HISTÓRICO */}
      {abaAtiva === 'HISTORICO' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="flex-1">
              <SearchInput
                placeholder="Buscar no histórico por condutor, placa ou local..."
                value={buscaHistorico}
                onChange={handleBuscaHistoricoChange}
                loading={loadingHistorico}
              />
            </div>

            {/* Filtros por intervalo de Data */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-400">De:</span>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="outline-none text-slate-700 font-semibold bg-transparent"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-400">Até:</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="outline-none text-slate-700 font-semibold bg-transparent"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-5">ID / Data</th>
                  <th className="py-3 px-5">Condutor / Placa</th>
                  <th className="py-3 px-5">Velocidade</th>
                  <th className="py-3 px-5">Endereço</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {historicoData && historicoData.data.length > 0 ? (
                  historicoData.data.map((item) => (
                    <InfracaoTableRow
                      key={item.id}
                      item={item}
                      onAbrirPdf={onAbrirPdf}
                      onEnviarEmail={onEnviarEmail}
                      loadingPdfId={loadingPdfId}
                      enviandoEmailId={enviandoEmailId}
                      textoBotaoEmail="Reenviar"
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      {loadingHistorico ? 'Carregando histórico...' : 'Nenhum registro encontrado no histórico.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação do Histórico */}
          {historicoData && (
            <Pagination
              page={historicoData.pagination.page}
              totalPages={historicoData.pagination.totalPages}
              total={historicoData.pagination.total}
              onPageChange={setPaginaHistorico}
            />
          )}
        </div>
      )}
    </div>
  )
}