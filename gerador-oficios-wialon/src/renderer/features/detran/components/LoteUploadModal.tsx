// src/renderer/features/detran/components/LoteUploadModal.tsx

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle,
  Info,
  Truck,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { cn } from '../../../lib/cn'

interface LoteUploadModalProps {
  open: boolean
  onClose: () => void
  onEnviar: (file: File) => void
  disabled?: boolean
}

const FORMATOS_ACEITOS = '.xlsx, .xls, .csv'
const EXTENSOES_VALIDAS = ['xlsx', 'xls', 'csv']
const TAMANHO_MAX_MB = 10

/** Exemplos prontos pra tabela de referência */
const EXEMPLO_LINHAS = [
  { placa: 'SAR3I78', chassi: '9535V6TB9PR048086', uf: 'CE' },
  { placa: 'MLX3F60', chassi: '3VWV96169EM639643', uf: 'CE' },
  { placa: 'SBU7G13', chassi: '8AFBR01F5RJ362505', uf: 'CE' },
]

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function LoteUploadModal({
  open,
  onClose,
  onEnviar,
  disabled,
}: LoteUploadModalProps) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setArquivo(null)
      setArrastando(false)
      setErro(null)
    }
  }, [open])

  /* ---------- Validação ---------- */

  const validar = (file: File): string | null => {
    const ext = file.name.toLowerCase().split('.').pop() || ''
    if (!EXTENSOES_VALIDAS.includes(ext)) {
      return 'Formato não aceito. Use um arquivo .xlsx, .xls ou .csv.'
    }
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      return `Arquivo maior que ${TAMANHO_MAX_MB}MB. Reduza o tamanho e tente novamente.`
    }
    if (file.size === 0) {
      return 'O arquivo está vazio.'
    }
    return null
  }

  const selecionarArquivo = (file: File) => {
    const msgErro = validar(file)
    if (msgErro) {
      setErro(msgErro)
      setArquivo(null)
      return
    }
    setErro(null)
    setArquivo(file)
  }

  /* ---------- Handlers ---------- */

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) selecionarArquivo(file)
    e.target.value = ''
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setArrastando(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) selecionarArquivo(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) setArrastando(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setArrastando(false)
  }

  const handleAbrirSeletor = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const handleConfirmar = () => {
    if (!arquivo) return
    onEnviar(arquivo)
    onClose()
  }

  const handleLimpar = () => {
    setArquivo(null)
    setErro(null)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={disabled}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmar}
            disabled={!arquivo || disabled}
          >
            <Upload className="w-4 h-4" />
            {arquivo ? `Importar (${formatarTamanho(arquivo.size)})` : 'Importar'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* ==================== Header customizado ==================== */}
        <div className="flex items-start gap-4 pb-5 border-b border-slate-100">
          <div className="relative shrink-0">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-white" />
            </span>
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Importar veículos
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                Em lote
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Envie uma planilha com as colunas <b>placa</b> e <b>chassi</b> para
              consultar os débitos de vários veículos de uma vez.
            </p>
          </div>
        </div>

        {/* ==================== Seção 1: formato esperado ==================== */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Formato esperado</h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            A primeira linha deve ser o cabeçalho. As colunas obrigatórias são{' '}
            <code className="px-1.5 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-100 rounded text-[11px] font-mono font-semibold">
              placa
            </code>{' '}
            e{' '}
            <code className="px-1.5 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-100 rounded text-[11px] font-mono font-semibold">
              chassi
            </code>{' '}
            (ou{' '}
            <code className="px-1.5 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-100 rounded text-[11px] font-mono font-semibold">
              renavam
            </code>
            ). Colunas extras são ignoradas.
          </p>

          {/* ============ Tabela estilo Excel ============ */}
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            {/* Barra de título estilo Excel */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 border-b border-emerald-800">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                <span className="text-[11px] font-semibold text-emerald-50 truncate">
                  veiculos-exemplo.xlsx
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
                <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
                <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
              </div>
            </div>

            <div className="overflow-x-auto bg-white">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="w-9 px-2 py-1.5 bg-slate-100 border-r border-slate-200">
                      {/* canto do Excel */}
                    </th>
                    <th className="px-3 py-1.5 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider border-r border-slate-200 bg-slate-50 w-12">
                      A
                    </th>
                    <th className="px-3 py-1.5 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider border-r border-slate-200 bg-slate-50">
                      B
                    </th>
                    <th className="px-3 py-1.5 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                      C
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Cabeçalho (linha 1) */}
                  <tr className="border-b border-slate-200 bg-emerald-50/60">
                    <td className="px-2 py-2 text-center font-mono text-slate-400 text-[10px] bg-slate-100 border-r border-slate-200">
                      1
                    </td>
                    <td className="px-3 py-2 font-bold text-emerald-800 border-r border-emerald-100 bg-emerald-50">
                      placa
                    </td>
                    <td className="px-3 py-2 font-bold text-emerald-800 border-r border-emerald-100 bg-emerald-50">
                      chassi
                    </td>
                    <td className="px-3 py-2 font-bold text-emerald-800 bg-emerald-50">
                      uf
                    </td>
                  </tr>

                  {/* Linhas de exemplo */}
                  {EXEMPLO_LINHAS.map((linha, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 last:border-0 hover:bg-cyan-50/40 transition"
                    >
                      <td className="px-2 py-2 text-center font-mono text-slate-400 text-[10px] bg-slate-100 border-r border-slate-200">
                        {idx + 2}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-100">
                        {linha.placa}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-100">
                        {linha.chassi}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-400">
                        {linha.uf}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dica */}
          <div className="flex items-start gap-2.5 text-[11px] bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100 rounded-lg p-3">
            <div className="p-1 rounded-md bg-cyan-100 shrink-0 mt-0.5">
              <Info className="w-3 h-3 text-cyan-600" />
            </div>
            <p className="leading-relaxed text-cyan-900">
              Linhas com placa ou chassi vazios são <b>ignoradas automaticamente</b>.
              Apenas a <b>primeira aba</b> do arquivo é lida.
            </p>
          </div>
        </div>

        {/* ==================== Seção 2: dropzone ==================== */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Selecione o arquivo</h3>
          </div>

          {!arquivo ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleAbrirSeletor}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleAbrirSeletor()
                }
              }}
              className={cn(
                'relative border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer outline-none',
                'focus-visible:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/20',
                arrastando &&
                  'border-cyan-500 bg-gradient-to-b from-cyan-50 to-blue-50 scale-[1.01] shadow-lg shadow-cyan-500/10',
                !arrastando &&
                  !disabled &&
                  'border-slate-200 bg-slate-50/40 hover:border-cyan-400 hover:bg-gradient-to-b hover:from-cyan-50/50 hover:to-blue-50/50',
                disabled &&
                  'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50/30'
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept={FORMATOS_ACEITOS}
                onChange={handleInputChange}
                className="hidden"
                disabled={disabled}
              />

              <div className="flex flex-col items-center gap-3 pointer-events-none">
                <div
                  className={cn(
                    'p-4 rounded-2xl transition',
                    arrastando
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 scale-110'
                      : 'bg-white text-slate-500 border border-slate-200 shadow-sm'
                  )}
                >
                  <Upload className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">
                    {arrastando
                      ? 'Solte o arquivo aqui'
                      : 'Arraste um arquivo ou clique para selecionar'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Formatos aceitos:{' '}
                    <span className="font-semibold text-slate-700">
                      XLSX, XLS, CSV
                    </span>{' '}
                    — até {TAMANHO_MAX_MB}MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {arquivo.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatarTamanho(arquivo.size)} —{' '}
                    <span className="font-semibold text-emerald-700">
                      pronto pra importar
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLimpar}
                disabled={disabled}
                title="Remover arquivo"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition shrink-0 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {erro && (
            <div className="flex items-start gap-2.5 text-xs text-rose-700 bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 rounded-lg p-3">
              <div className="p-1 rounded-md bg-rose-100 shrink-0 mt-0.5">
                <AlertCircle className="w-3 h-3 text-rose-600" />
              </div>
              <p className="leading-relaxed">{erro}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}