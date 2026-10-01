// src/renderer/pages/InfracoesPage.tsx

import { useEffect, useState } from 'react'
import type { Infracao } from '../features/infracoes/services/infracoes'

import { Card } from '../components/ui/Card'
import { Pagination } from '../components/ui/Pagination'

import { InfracoesMetricas } from '../features/infracoes/components/InfracoesMetricas'
import { InfracaoFila } from '../features/infracoes/components/InfracaoFila'
import { InfracaoMapa } from '../features/infracoes/components/InfracaoMapa'
import { InfracaoDrawer } from '../features/infracoes/components/InfracaoDrawer'
import { InfracaoTable } from '../features/infracoes/components/InfracaoTable'
import { InfracaoHistoricoFilters } from '../features/infracoes/components/InfracaoHistoricoFilters'

import { useInfracoesOperacionais } from '../features/infracoes/hooks/useInfracoesOperacionais'
import { useInfracoesHistorico } from '../features/infracoes/hooks/useInfracoesHistorico'
import { useInfracoesOrdenacao } from '../features/infracoes/hooks/useInfracoesOrdenacao'
import { useGerarPdfInfracao } from '../features/infracoes/hooks/useGerarPdfInfracao'

import type { InfracoesAba } from '../components/layout/Header'

interface InfracoesPageProps {
  /** Aba ativa (elevada pro App) */
  abaAtiva: InfracoesAba
  onAbaChange: (aba: InfracoesAba) => void

  /** Contador externo — quando muda, força a recarga da lista */
  refreshKey?: number
  gerandoPdfId?: number | null
  onAbrirPdf: (id: number, placa: string, condutor: string) => void
  onGerarPdf?: (id: number) => void
  onEnviarEmail: (id: number) => void
  onAtualizarStatus: () => void
}

export function InfracoesPage({
  abaAtiva,
  // onAbaChange é recebido mas quem consome é o Header (via App)
  onAbaChange: _onAbaChange,
  refreshKey = 0,
  gerandoPdfId: gerandoPdfIdProp,
  onAbrirPdf,
  onGerarPdf,
  onEnviarEmail,
  onAtualizarStatus,
}: InfracoesPageProps) {
  /* ---------- Estado de UI ---------- */
  const [selecionadaId, setSelecionadaId] = useState<number | null>(null)
  const [buscaOperacional, setBuscaOperacional] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')

  /* ---------- Operacional ---------- */
  const {
    data: operacionais,
    meta: metaOperacional,
    carregando: carregandoOperacional,
    recarregar: recarregarOperacional,
    // ─── NOVO: paginação vem do hook ─────────────────────────────
    pagina: paginaOperacional,
    setPagina: setPaginaOperacional,
  } = useInfracoesOperacionais({
    busca: buscaOperacional,
    pollingAtivo: abaAtiva === 'OPERACIONAL',
  })

  const selecionada = operacionais.find((i) => i.id === selecionadaId) ?? null

  // Recarrega quando o App sinaliza (sincronização, gerar PDF, etc)
  useEffect(() => {
    recarregarOperacional()
  }, [refreshKey, recarregarOperacional])

  // ─── NOVO: limpa a seleção ao trocar de página ────────────────
  // Se a infração selecionada não estiver na nova página, o drawer
  // ficaria órfão. Limpar explicitamente mantém o estado coerente.
  useEffect(() => {
    setSelecionadaId(null)
  }, [paginaOperacional])

  /* ---------- Histórico ---------- */
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

  /* ---------- Gerar PDF ---------- */
  const { gerarPdf, gerandoPdfId } = useGerarPdfInfracao({
    onGerarPdfExterno: onGerarPdf,
    gerandoPdfIdExterno: gerandoPdfIdProp,
    onSucesso: () => {
      onAtualizarStatus()
      if (abaAtiva === 'HISTORICO') carregarHistorico()
    },
  })

  /* ---------- Derivados ---------- */
  const historicoLista: Infracao[] = Array.isArray(historicoData?.data)
    ? historicoData.data
    : []

  const historicoOrdenado = (() => {
    const filtrados = historicoLista.filter((item) => {
      const statusItem = (item as any).status || (item as any).status_envio || ''
      return filtroStatus === 'TODOS' || statusItem === filtroStatus
    })
    return ordenarLista(filtrados)
  })()

  /* ---------- Métricas da página (a partir da página atual da fila) ---------- */
  const metricas = {
    pendentes: operacionais.filter(
      (i) => i.status === 'PENDENTE' || i.status === 'REGISTRADO'
    ).length,
    processando: operacionais.filter((i) => i.status === 'PROCESSANDO').length,
    enviadas: operacionais.filter((i) => i.status === 'ENVIADO').length,
    erros: operacionais.filter((i) => i.status === 'ERRO').length,
  }

  const limparFiltroData = () => {
    setDataInicio('')
    setDataFim('')
  }

  return (
    <div className="min-h-full flex flex-col bg-slate-100 dark:bg-petrol-950 transition-colors">

      {/* ══════════ BARRA DE MÉTRICAS ══════════ */}
      <div className="
        flex items-center px-5 h-9 text-[11px]
        bg-white/60 dark:bg-petrol-900/60
        border-b border-slate-200/80 dark:border-petrol-800
        transition-colors
      ">
        <InfracoesMetricas
          pendentes={metricas.pendentes}
          processando={metricas.processando}
          enviadas={metricas.enviadas}
          erros={metricas.erros}
        />
      </div>

      {/* ══════════ CONTEÚDO ══════════ */}
      <div className="flex-1 min-h-0">

        {/* ───── ABA OPERACIONAL ───── */}
        {abaAtiva === 'OPERACIONAL' && (
          <div className="flex h-full" style={{ minHeight: 'calc(100vh - 140px)' }}>
            <InfracaoFila
              infracoes={operacionais}
              carregando={carregandoOperacional}
              selecionadaId={selecionadaId}
              onSelecionar={(item) => setSelecionadaId(item.id)}
              busca={buscaOperacional}
              onBuscaChange={setBuscaOperacional}
              // ─── NOVO: paginação ────────────────────────────────
              pagina={paginaOperacional}
              totalPages={metaOperacional?.totalPages ?? 1}
              total={metaOperacional?.totalItems ?? 0}
              onPageChange={setPaginaOperacional}
            />

            <div className="flex-1 min-w-0 flex">
              <InfracaoMapa infracoes={operacionais} selecionada={selecionada} />

              {selecionada && (
                <InfracaoDrawer
                  item={selecionada}
                  onFechar={() => setSelecionadaId(null)}
                  onGerarPdf={gerarPdf}
                  gerandoPdf={gerandoPdfId === selecionada.id}
                />
              )}
            </div>
          </div>
        )}

        {/* ───── ABA HISTÓRICO ───── */}
        {abaAtiva === 'HISTORICO' && (
          <div className="p-6">
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
                loadingPdfId={null}
                gerandoPdfId={gerandoPdfId}
                enviandoEmailId={null}
              />

              {historicoData?.meta && historicoData.meta.totalPages > 1 && (
                <Pagination
                  page={historicoData.meta.page ?? 1}
                  totalPages={historicoData.meta.totalPages ?? 1}
                  total={historicoData.meta.totalItems ?? 0}
                  onPageChange={setPaginaHistorico}
                />
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}