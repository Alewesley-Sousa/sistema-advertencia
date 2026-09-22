// src/renderer/pages/ConsultaDetranPage.tsx

import { useState, type FormEvent } from 'react'
import { Search, Upload } from 'lucide-react'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Pagination } from '../components/ui/Pagination'

import { DetranForm } from '../features/detran/components/DetranForm'
import { LoteUploadModal } from '../features/detran/components/LoteUploadModal'
import { DetranTable } from '../features/detran/components/DetranTable'
import { DetranMultasModal } from '../features/detran/components/DetranMultasModal'
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

  const { consultar, consultando } = useConsultaDetran(recarregar)
  const { processarArquivo, progresso, processando, fechar } = useLoteDetran(recarregar)

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

  const handleFecharProgresso = () => {
    fechar()
  }

  return (
    <div className="space-y-6">
      {/* ================= Cabeçalho ================= */}
      <Card className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-6 h-6 text-cyan-600" />
            Consulta de Débitos DETRAN-CE
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automação de consulta de multas com download dos boletos em PDF.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setModalUploadAberto(true)}
          disabled={processando}
        >
          <Upload className="w-4 h-4" />
          Importar Veículos
        </Button>
      </Card>

      {/* ================= Consulta avulsa ================= */}
      <DetranForm
        placa={placa}
        chassi={chassi}
        onPlacaChange={setPlaca}
        onChassiChange={setChassi}
        onSubmit={handleSubmit}
        loading={consultando}
        disabled={processando}
      />

      {/* ================= Tabela + Filtros + Paginação ================= */}
      <Card padding="none" className="overflow-hidden">
        {/* Filtros */}
        <DetranHistoricoFilters
          busca={busca}
          onBuscaChange={handleBuscaChange}
          loadingBusca={carregando}
          filtroStatus={filtroStatus}
          onFiltroStatusChange={handleFiltroStatusChange}
        />

        {/* Contador no canto */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Resultados Recentes</h2>
          {meta && meta.totalItems > 0 && (
            <span className="text-xs text-slate-500">
              {meta.totalItems} veículo{meta.totalItems === 1 ? '' : 's'}
            </span>
          )}
        </div>

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
      </Card>

      {/* ================= Modais ================= */}

      <LoteUploadModal
        open={modalUploadAberto}
        onClose={() => setModalUploadAberto(false)}
        onEnviar={processarArquivo}
        disabled={processando}
      />

      <DetranMultasModal
        open={modalMultasAberto}
        onClose={handleFecharModalMultas}
        placa={placaSelecionada}
        multas={multas}
        carregando={carregandoMultas}
      />

      <DetranProgressModal
        open={processando || progresso?.status === 'CONCLUIDO'}
        progresso={progresso}
        onFechar={handleFecharProgresso}
      />
    </div>
  )
}