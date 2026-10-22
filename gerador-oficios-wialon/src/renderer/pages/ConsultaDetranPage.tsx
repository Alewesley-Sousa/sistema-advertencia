// src/renderer/pages/ConsultaDetranPage.tsx

import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckSquare, Download, FileBarChart2, Loader2, X } from 'lucide-react'

import { PageHeader } from '../components/layout/PageHeader'
import { Pagination } from '../components/ui/Pagination'

import { DetranForm } from '../features/detran/components/DetranForm'
import { DetranLotePanel } from '../features/detran/components/DetranLotePanel'
import { DetranConsultaFeedback } from '../features/detran/components/DetranConsultaFeedback'
import { LoteUploadModal } from '../features/detran/components/LoteUploadModal'
import { DetranTable, podeExportar  } from '../features/detran/components/DetranTable'
import { DetranMultasDrawer } from '../features/detran/components/DetranMultasDrawer'
import { DetranProgressModal } from '../features/detran/components/DetranProgressModal'
import { DetranHistoricoFilters } from '../features/detran/components/DetranHistoricoFilters'
const DetranRelatorios = lazy(() =>
  import('../features/detran/components/DetranRelatorios').then((modulo) => ({
    default: modulo.DetranRelatorios,
  }))
)

import { useDetranHistorico } from '../features/detran/hooks/useDetranHistorico'
import { useConsultaDetran } from '../features/detran/hooks/useConsultaDetran'
import { useLoteDetran } from '../features/detran/hooks/useLoteDetran'
import { useDetranMultas } from '../features/detran/hooks/useDetranMultas'
import { useExportarDetran } from '../features/detran/hooks/useExportarDetran'
import type { InfracaoDetran } from '../features/detran/services/detran'

export function ConsultaDetranPage() {
  const [placa, setPlaca] = useState('')
  const [chassi, setChassi] = useState('')
  const [placaSelecionada, setPlacaSelecionada] = useState<string | undefined>()
  const [modalUploadAberto, setModalUploadAberto] = useState(false)
  const [exportandoId, setExportandoId] = useState<number | null>(null)
  const [modoSelecao, setModoSelecao] = useState(false)
  const [mostrarRelatorios, setMostrarRelatorios] = useState(false)

  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const ultimoIndexRef = useRef<number | null>(null)

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

  const { exportando, erro: erroExport, exportar } = useExportarDetran()

  /* ─────────────────────────────────────────────────────────
     Seleção — limpa ao trocar filtro, reseta âncora ao paginar
  ───────────────────────────────────────────────────────── */
  useEffect(() => {
    setSelecionados(new Set())
    setModoSelecao(false)
    ultimoIndexRef.current = null
  }, [busca, filtroStatus])

  useEffect(() => {
    ultimoIndexRef.current = null
  }, [pagina])

  const limparSelecao = () => {
    setSelecionados(new Set())
    ultimoIndexRef.current = null
  }

const handleToggleSelecao = (index: number, shiftKey: boolean) => {
  const item = consultas[index]
  if (!item?.id) return

  // Item clicado sem PDF: ignora (o checkbox já está disabled, mas por segurança)
  if (!podeExportar(item)) return

  // Capturado antes do callback: TS preserva o narrowing aqui
  const itemId: number = item.id

  setSelecionados((prev) => {
    const next = new Set(prev)

    if (shiftKey && ultimoIndexRef.current != null) {
      const [a, b] = [ultimoIndexRef.current, index].sort((x, y) => x - y)

      // Só itens elegíveis dentro do intervalo
      const elegiveisNoIntervalo = consultas
        .slice(a, b + 1)
        .filter(
          (c): c is InfracaoDetran & { id: number } =>
            c.id != null && podeExportar(c)
        )

      const todosNoIntervalo =
        elegiveisNoIntervalo.length > 0 &&
        elegiveisNoIntervalo.every((c) => next.has(c.id))

      for (const c of elegiveisNoIntervalo) {
        if (todosNoIntervalo) next.delete(c.id)
        else next.add(c.id)
      }
    } else {
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
    }

    return next
  })

  ultimoIndexRef.current = index
}

const handleToggleTodos = (marcar: boolean) => {
  setSelecionados((prev) => {
    const next = new Set(prev)
    for (const c of consultas) {
      if (c.id == null) continue
      if (!podeExportar(c)) continue
      if (marcar) next.add(c.id)
      else next.delete(c.id)
    }
    return next
  })
}

  /* ─────────────────────────────────────────────────────────
     Modo seleção
  ───────────────────────────────────────────────────────── */
  const entrarModoSelecao = () => setModoSelecao(true)

  const sairModoSelecao = () => {
    setModoSelecao(false)
    limparSelecao()
  }

  const temSelecao = selecionados.size > 0
  const totalSelecionado = selecionados.size

  /* ─────────────────────────────────────────────────────────
     Handlers existentes
  ───────────────────────────────────────────────────────── */
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

  /* ─────────────────────────────────────────────────────────
     Exportação
  ───────────────────────────────────────────────────────── */
  const handleExportarLinha = async (consultaId: number) => {
    setExportandoId(consultaId)
    try {
      await exportar([consultaId])
    } finally {
      setExportandoId(null)
    }
  }

  const handleExportarTudo = async () => {
    await exportar()
  }

  const handleExportarSelecionadas = async () => {
    if (selecionados.size === 0) return
    const ok = await exportar(Array.from(selecionados))
    if (ok) sairModoSelecao()
  }

  return (
    <div className="max-w-[1400px] mx-auto px-5 pt-8 pb-10 space-y-8">

      <PageHeader
        eyebrow="DETRAN-CE · FROTA"
        title={mostrarRelatorios ? 'Relatórios do DETRAN' : 'Central de Consultas'}
        subtitle={mostrarRelatorios
          ? 'Indicadores consolidados das consultas realizadas e dos débitos identificados.'
          : 'Consulte débitos e multas de veículos diretamente no portal do DETRAN-CE.'}
        action={(
          <button
            type="button"
            onClick={() => setMostrarRelatorios((valor) => !valor)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:border-petrol-400 hover:bg-slate-50 dark:border-petrol-700 dark:bg-petrol-900 dark:text-petrol-100 dark:hover:bg-petrol-800"
          >
            {mostrarRelatorios ? (
              <ArrowLeft className="h-4 w-4" />
            ) : (
              <FileBarChart2 className="h-4 w-4" />
            )}
            {mostrarRelatorios ? 'Voltar às consultas' : 'Relatórios'}
          </button>
        )}
      />

      <style>{`
        @keyframes detran-content-enter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .detran-content-enter {
          animation: detran-content-enter 220ms ease-out both;
        }
      `}</style>

      <div key={mostrarRelatorios ? 'relatorios' : 'consultas'} className="detran-content-enter">
        {mostrarRelatorios ? (
          <Suspense
            fallback={(
              <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-slate-500 dark:text-petrol-300/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando relatórios...
              </div>
            )}
          >
            <DetranRelatorios />
          </Suspense>
        ) : (
          <>
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

          {meta && meta.totalItems > 0 && (
            <div className="flex items-center gap-2">

              {modoSelecao ? (
                <>
                  {temSelecao && (
                    <button
                      type="button"
                      onClick={limparSelecao}
                      className="
                        inline-flex items-center gap-1.5
                        px-2.5 py-2 rounded-md
                        text-[11.5px] font-semibold
                        text-slate-500 dark:text-petrol-300/80
                        hover:text-slate-800 dark:hover:text-petrol-100
                        hover:bg-slate-100 dark:hover:bg-petrol-800
                        cursor-pointer transition-colors
                      "
                    >
                      <X className="w-3.5 h-3.5" />
                      Limpar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={sairModoSelecao}
                    className="
                      px-2.5 py-2 rounded-md
                      text-[11.5px] font-semibold
                      text-slate-500 dark:text-petrol-300/80
                      hover:text-slate-800 dark:hover:text-petrol-100
                      hover:bg-slate-100 dark:hover:bg-petrol-800
                      cursor-pointer transition-colors
                    "
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleExportarSelecionadas}
                    disabled={exportando || !temSelecao}
                    className="
                      inline-flex items-center gap-2
                      px-3.5 py-2 rounded-md
                      text-[12px] font-semibold
                      border border-petrol-600 dark:border-petrol-500
                      bg-petrol-600 dark:bg-petrol-500
                      text-white
                      hover:bg-petrol-700 dark:hover:bg-petrol-600
                      disabled:opacity-40 disabled:cursor-not-allowed
                      cursor-pointer transition-colors
                    "
                  >
                    {exportando ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {exportando
                      ? 'Exportando…'
                      : `Exportar ${totalSelecionado} selecionada${totalSelecionado === 1 ? '' : 's'}`}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={entrarModoSelecao}
                    className="
                      inline-flex items-center gap-2
                      px-3.5 py-2 rounded-md
                      text-[12px] font-semibold
                      border border-slate-200 dark:border-petrol-700
                      bg-white dark:bg-petrol-900
                      text-slate-700 dark:text-petrol-100
                      hover:bg-slate-50 dark:hover:bg-petrol-800
                      cursor-pointer transition-colors
                    "
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Selecionar
                  </button>

                  <button
                    type="button"
                    onClick={handleExportarTudo}
                    disabled={exportando}
                    className="
                      inline-flex items-center gap-2
                      px-3.5 py-2 rounded-md
                      text-[12px] font-semibold
                      border border-slate-200 dark:border-petrol-700
                      bg-white dark:bg-petrol-900
                      text-slate-700 dark:text-petrol-100
                      hover:bg-slate-50 dark:hover:bg-petrol-800
                      disabled:opacity-50 disabled:cursor-not-allowed
                      cursor-pointer transition-colors
                    "
                  >
                    {exportando ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {exportando ? 'Exportando…' : 'Exportar tudo'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {erroExport && (
          <div className="
            mb-3 px-3 py-2 rounded-md
            bg-rose-50 dark:bg-rose-950/40
            border border-rose-200 dark:border-rose-900
            text-[12px] text-rose-700 dark:text-rose-300
            transition-colors
          ">
            {erroExport}
          </div>
        )}

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

          <div
            aria-label="Legenda das situações de IPVA e licenciamento"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 bg-white px-4 py-3 text-[10.5px] dark:border-petrol-800 dark:bg-petrol-900"
          >
            <span className="font-semibold text-slate-500 dark:text-petrol-200">
              Legenda de débitos:
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Com débito: pendência sinalizada pelo Detran
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Regular: sem débito sinalizado
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Informativo: não confirma débito nem regularidade
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-petrol-300/70">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Não identificado: situação não reconhecida na consulta
            </span>
          </div>

          <DetranTable
            consultas={consultas}
            carregando={carregando}
            onVerMultas={handleVerMultas}
            onExportar={handleExportarLinha}
            exportandoId={exportandoId}
            mostrarSelecao={modoSelecao}
            selecionados={selecionados}
            onToggleSelecao={handleToggleSelecao}
            onToggleTodos={handleToggleTodos}
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
          </>
        )}
      </div>

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
        open={
          processando ||
          progresso?.status === 'CONCLUIDO' ||
          progresso?.status === 'ERRO'
        }
        progresso={progresso}
        onFechar={fechar}
      />

    </div>
  )
}