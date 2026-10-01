// src/renderer/pages/ConsultaDetranPage.tsx

import { useState, type FormEvent } from 'react'

import { PageHeader } from '../components/layout/PageHeader'
import { Pagination } from '../components/ui/Pagination'

import { DetranForm } from '../features/detran/components/DetranForm'
import { DetranLotePanel } from '../features/detran/components/DetranLotePanel'
import { DetranConsultaFeedback } from '../features/detran/components/DetranConsultaFeedback'
import { LoteUploadModal } from '../features/detran/components/LoteUploadModal'
import { DetranTable } from '../features/detran/components/DetranTable'
import { DetranMultasDrawer } from '../features/detran/components/DetranMultasDrawer'
import { DetranProgressModal } from '../features/detran/components/DetranProgressModal'
import { DetranHistoricoFilters } from '../features/detran/components/DetranHistoricoFilters'

import { useDetranHistorico } from '../features/detran/hooks/useDetranHistorico'
import { useConsultaDetran } from '../features/detran/hooks/useConsultaDetran'
import { useLoteDetran } from '../features/detran/hooks/useLoteDetran'
import { useDetranMultas } from '../features/detran/hooks/useDetranMultas'

export function ConsultaDetranPage() {
  const [placa, setPlaca] = useState('')
  const [chassi, setChassi] = useState('')
  const [placaSelecionada, setPlacaSelecionada] = useState<string | undefined>()
  const [modalUploadAberto, setModalUploadAberto] = useState(false)

  const {
    consultas,
    carregando,
    recarregar,
    pagina,
    setPagina,
    meta,
    busca,
    filtroStatus,
    handleBuscaChange,
    handleFiltroStatusChange,
  } = useDetranHistorico()

  const { consultar, consultando, ultimoResultado } =
    useConsultaDetran(recarregar)
  const { processarArquivo, progresso, processando, fechar } =
    useLoteDetran(recarregar)

  const {
    multas,
    carregando: carregandoMultas,
    open: modalMultasAberto,
    abrir: abrirMultas,
    fechar: fecharMultas,
  } = useDetranMultas()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!placa || !chassi) return

    const ok = await consultar({ placa, chassi })
    if (ok) {
      setPlaca('')
      setChassi('')
    }
  }

  const handleVerMultas = (consultaId: number, placaConsulta: string) => {
    setPlacaSelecionada(placaConsulta)
    abrirMultas(consultaId)
  }

  const handleFecharModalMultas = () => {
    fecharMultas()
    setPlacaSelecionada(undefined)
  }

  return (
    <div className="max-w-[1400px] mx-auto px-5 pt-8 pb-10 space-y-8">

      <PageHeader
        eyebrow="DETRAN-CE · FROTA"
        title="Central de Consultas"
        subtitle="Consulte débitos e multas de veículos diretamente no portal do DETRAN-CE."
      />

      {/* ═════════════════════════════════════════════════════════════
          Superfície operacional — consulta individual + lote
      ═════════════════════════════════════════════════════════════ */}
      <section className="
        bg-white dark:bg-petrol-900
        border border-slate-200 dark:border-petrol-800
        rounded-md overflow-hidden transition-colors
      ">
        <div className="grid grid-cols-1 lg:grid-cols-5">

          {/* Coluna esquerda — formulário de consulta individual */}
          <div className="
            lg:col-span-3 flex flex-col
            p-6 lg:p-8
            border-b lg:border-b-0 lg:border-r
            border-slate-200 dark:border-petrol-800
            transition-colors
          ">
            <DetranForm
              placa={placa}
              chassi={chassi}
              onPlacaChange={setPlaca}
              onChassiChange={setChassi}
              onSubmit={handleSubmit}
              loading={consultando}
              disabled={processando}
            >
              {ultimoResultado && (
                <DetranConsultaFeedback resultado={ultimoResultado} />
              )}
            </DetranForm>
          </div>

          {/* Coluna direita — painel de lote */}
          <div className="
            lg:col-span-2 p-6 lg:p-8
            bg-slate-50/60 dark:bg-petrol-950/40
            transition-colors
          ">
            <DetranLotePanel
              onImportar={() => setModalUploadAberto(true)}
              onBaixarModelo={() =>
                alert(
                  'Modelo XLSX: baixe o arquivo modelo com as colunas A (Placa) e B (Chassi).'
                )
              }
              disabled={processando}
            />
          </div>

        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════
          Histórico — cabeçalho + filtros + tabela + paginação
      ═════════════════════════════════════════════════════════════ */}
      <section id="secao-consultas">

        {/* Cabeçalho de seção */}
        <div className="mb-5 flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="
              text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5
              text-slate-400 dark:text-petrol-400/60
              transition-colors
            ">
              Histórico operacional
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="
                text-[20px] font-bold tracking-tight
                text-slate-900 dark:text-white
                transition-colors
              ">
                Consultas realizadas
              </h2>

              {meta && meta.totalItems > 0 && (
                <span className="
                  font-mono text-[11px]
                  text-slate-400 dark:text-petrol-400/60
                  transition-colors
                ">
                  <span className="font-bold text-slate-600 dark:text-petrol-200">
                    {meta.totalItems}
                  </span>{' '}
                  registros
                </span>
              )}
            </div>

            <p className="
              text-[12.5px] mt-1
              text-slate-500 dark:text-petrol-300/80
              transition-colors
            ">
              Histórico e status das consultas realizadas no DETRAN-CE.
            </p>
          </div>
        </div>

        {/* Card que envolve filtros + tabela + paginação */}
        <div className="
          bg-white dark:bg-petrol-900
          border border-slate-200 dark:border-petrol-800
          rounded-md overflow-hidden transition-colors
        ">
          <DetranHistoricoFilters
            busca={busca}
            onBuscaChange={handleBuscaChange}
            loadingBusca={carregando}
            filtroStatus={filtroStatus}
            onFiltroStatusChange={handleFiltroStatusChange}
          />

          <DetranTable
            consultas={consultas}
            carregando={carregando}
            onVerMultas={handleVerMultas}
          />

          {meta && meta.totalPages > 1 && (
            <Pagination
              page={pagina}
              totalPages={meta.totalPages}
              total={meta.totalItems}
              onPageChange={setPagina}
            />
          )}
        </div>

      </section>

      {/* ═════════════════════════════════════════════════════════════
          Modais e Drawer
      ═════════════════════════════════════════════════════════════ */}
      <LoteUploadModal
        open={modalUploadAberto}
        onClose={() => setModalUploadAberto(false)}
        onEnviar={processarArquivo}
        disabled={processando}
      />

      <DetranMultasDrawer
        open={modalMultasAberto}
        onClose={handleFecharModalMultas}
        placa={placaSelecionada}
        multas={multas}
        carregando={carregandoMultas}
      />

      <DetranProgressModal
        open={processando || progresso?.status === 'CONCLUIDO'}
        progresso={progresso}
        onFechar={fechar}
      />

    </div>
  )
}