// src/renderer/features/detran/components/LoteUploadModal.tsx

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
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

const EXEMPLO = [
  ['ABC1D23', '9BWZZZ377VT004251'],
  ['DEF4G56', '9BWYYY377VT004252'],
  ['GHI7J89', '9BWXXX377VT004253'],
]

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extrairExtensao(nome: string): string {
  return nome.toLowerCase().split('.').pop() || ''
}

/* ════════════════════════════════════════════════════════════════════════
 * ESCOPO DE TOKENS — azul-petróleo estrutural com variantes dark
 *
 * Todas as cores do modal vêm daqui. Os valores-base (light) ficam em
 * `.lote-scope`; as sobrescritas do dark ficam em `.dark .lote-scope`.
 * Assim o JSX só referencia `var(--lote-*)` e o tema resolve sozinho.
 * ════════════════════════════════════════════════════════════════════════ */
const LOTE_SCOPE_STYLES = `
.lote-scope {
  --lote-hero-bg:      #0F3F4A;
  --lote-hero-bg-2:    #0A2F38;
  --lote-hero-text:    #ffffff;
  --lote-hero-text-2:  rgba(203, 213, 225, 0.9);

  --lote-soft-bg:      #EAF5F7;
  --lote-line:         #C7DEE2;
  --lote-line-soft:    #F1F5F9;
  --lote-ink:          #0B3038;
  --lote-muted:        #4B7A82;

  --lote-accent:       #06B6D4;
  --lote-accent-ring:  rgba(6, 182, 212, 0.08);
  --lote-accent-glow:  rgba(6, 182, 212, 0.28);
  --lote-accent-halo:  #67E8F9;

  --lote-drop-bg:      #FBFDFE;
  --lote-drop-bg-hover:#F5FBFD;
  --lote-drop-bg-active:#ECFAFD;
  --lote-drop-halo:    #C7DEE2;
}

.dark .lote-scope {
  /* Hero: sobe pra petrol-800 pra se destacar do modal petrol-900 */
  --lote-hero-bg:      #0B3542;
  --lote-hero-bg-2:    #082732;
  --lote-hero-text:    #ffffff;
  --lote-hero-text-2:  rgba(147, 191, 200, 0.9);

  /* Superfície tintada: petrol-800/60 sobre petrol-900 */
  --lote-soft-bg:      #0B3542;
  --lote-line:         #0B3542;
  --lote-line-soft:    #082732;
  --lote-ink:          #93BFC8;
  --lote-muted:        #93BFC8;

  /* Acento: petrol-400 — mais claro pra brilhar no escuro */
  --lote-accent:       #5A98A5;
  --lote-accent-ring:  rgba(90, 152, 165, 0.15);
  --lote-accent-glow:  rgba(90, 152, 165, 0.35);
  --lote-accent-halo:  #2E7A8A;

  /* Dropzone: fundo recuado (petrol-950) sobre modal (petrol-900) */
  --lote-drop-bg:      #041821;
  --lote-drop-bg-hover:#082732;
  --lote-drop-bg-active:#0B3542;
  --lote-drop-halo:    #0B3542;
}
`

/* ════════════════════════════════════════════════════════════════════════
 * ESTRUTURA DA PLANILHA
 * ════════════════════════════════════════════════════════════════════════ */
function EstruturaPlanilha() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="w-1 h-3 rounded-sm"
          style={{ backgroundColor: 'var(--lote-hero-bg)' }}
          aria-hidden
        />
        <span className="text-[10px] font-bold text-slate-500 dark:text-petrol-300/70 tracking-[0.16em] uppercase transition-colors">
          Formato da planilha
        </span>
      </div>

      <div
        className="rounded-md overflow-hidden bg-white dark:bg-petrol-950 transition-colors"
        style={{ border: '1px solid var(--lote-line)' }}
      >
        {/* Letras das colunas */}
        <div
          className="grid grid-cols-2"
          style={{ backgroundColor: 'var(--lote-hero-bg)' }}
        >
          <div
            className="py-1.5 text-center text-[10px] font-bold font-mono tracking-wider"
            style={{
              color: 'var(--lote-accent-halo)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            A
          </div>
          <div
            className="py-1.5 text-center text-[10px] font-bold font-mono tracking-wider"
            style={{ color: 'var(--lote-accent-halo)' }}
          >
            B
          </div>
        </div>

        {/* Header PLACA / CHASSI */}
        <div
          className="grid grid-cols-2"
          style={{
            backgroundColor: 'var(--lote-soft-bg)',
            borderBottom: '1px solid var(--lote-line)',
          }}
        >
          <div
            className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{
              color: 'var(--lote-ink)',
              borderRight: '1px solid var(--lote-line)',
            }}
          >
            Placa
          </div>
          <div
            className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--lote-ink)' }}
          >
            Chassi
          </div>
        </div>

        {/* Dados */}
        {EXEMPLO.map(([placa, chassi], i) => (
          <div
            key={placa}
            className={cn(
              'grid grid-cols-2',
              i < EXEMPLO.length - 1 &&
                'border-b border-slate-100 dark:border-petrol-800 transition-colors'
            )}
          >
            <div
              className="px-3 py-1.5 text-[11px] font-mono text-slate-700 dark:text-petrol-200/80 transition-colors"
              style={{ borderRight: '1px solid var(--lote-line-soft)' }}
            >
              {placa}
            </div>
            <div className="px-3 py-1.5 text-[11px] font-mono text-slate-700 dark:text-petrol-200/80 transition-colors">
              {chassi}
            </div>
          </div>
        ))}
      </div>

      {/* Regra de importação */}
      <div className="mt-2.5 flex items-center flex-wrap gap-x-2 gap-y-1 text-[10.5px] text-slate-500 dark:text-petrol-300/60 transition-colors">
        <span
          className="font-mono font-bold"
          style={{ color: 'var(--lote-ink)' }}
        >
          A
        </span>
        <span>→ Placa</span>
        <span className="text-slate-300 dark:text-petrol-700 transition-colors">·</span>
        <span
          className="font-mono font-bold"
          style={{ color: 'var(--lote-ink)' }}
        >
          B
        </span>
        <span>→ Chassi</span>
        <span className="text-slate-300 dark:text-petrol-700 transition-colors">·</span>
        <span className="text-slate-400 dark:text-petrol-300/40 transition-colors">
          demais colunas ignoradas
        </span>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
 * COMPONENTE
 * ════════════════════════════════════════════════════════════════════════ */
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

  const validar = (file: File): string | null => {
    const ext = extrairExtensao(file.name)
    if (!EXTENSOES_VALIDAS.includes(ext))
      return 'Formato não aceito. Use um arquivo .xlsx, .xls ou .csv.'
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024)
      return `Arquivo maior que ${TAMANHO_MAX_MB}MB. Reduza o tamanho e tente novamente.`
    if (file.size === 0) return 'O arquivo está vazio.'
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

  const handleConfirmar = () => {
    if (!arquivo) return
    onEnviar(arquivo)
    onClose()
  }

  const handleLimpar = () => {
    setArquivo(null)
    setErro(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
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
            Iniciar consulta
          </Button>
        </>
      }
    >
      <style>{LOTE_SCOPE_STYLES}</style>
      <style>{`
        @keyframes lote-state-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lote-state-in {
          animation: lote-state-in 220ms cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      <div className="lote-scope space-y-6">
        {/* ═══ HERO ═══ */}
        <div
          className="relative overflow-hidden rounded-lg px-6 py-5 transition-colors"
          style={{ backgroundColor: 'var(--lote-hero-bg)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3
                className="text-[17px] font-bold tracking-tight leading-tight transition-colors"
                style={{ color: 'var(--lote-hero-text)' }}
              >
                Preparar consulta de frota
              </h3>

              <p
                className="text-[12px] mt-1.5 leading-relaxed max-w-md transition-colors"
                style={{ color: 'var(--lote-hero-text-2)' }}
              >
                Importe uma planilha com placa e chassi para consultar vários
                veículos em sequência no DETRAN-CE.
              </p>
            </div>
          </div>
        </div>

        {/* ═══ FORMATO ESPERADO ═══ */}
        <EstruturaPlanilha />

        {/* ═══ ÁREA DE IMPORTAÇÃO ═══ */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className="w-1 h-3 rounded-sm"
              style={{ backgroundColor: 'var(--lote-hero-bg)' }}
              aria-hidden
            />
            <span className="text-[10px] font-bold text-slate-500 dark:text-petrol-300/70 tracking-[0.16em] uppercase transition-colors">
              Importar arquivo
            </span>
          </div>

          {!arquivo ? (
            <div
              key="dropzone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !disabled && inputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (!disabled) inputRef.current?.click()
                }
              }}
              className={cn(
                'group relative lote-state-in rounded-xl cursor-pointer outline-none overflow-hidden',
                'transition-[background-color,border-color,box-shadow] duration-300 ease-out',
                'focus-visible:ring-2 focus-visible:ring-[color:var(--lote-accent)]/50 focus-visible:ring-offset-2',
                disabled && 'opacity-60 cursor-not-allowed'
              )}
              style={{
                backgroundColor: arrastando
                  ? 'var(--lote-drop-bg-active)'
                  : 'var(--lote-drop-bg)',
                border: `1.5px dashed ${
                  arrastando ? 'var(--lote-accent)' : 'var(--lote-line)'
                }`,
                boxShadow: arrastando
                  ? `0 0 0 4px var(--lote-accent-ring), inset 0 0 32px var(--lote-accent-ring)`
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (disabled || arrastando) return
                e.currentTarget.style.backgroundColor = 'var(--lote-drop-bg-hover)'
                e.currentTarget.style.borderColor = 'var(--lote-accent)'
              }}
              onMouseLeave={(e) => {
                if (disabled || arrastando) return
                e.currentTarget.style.backgroundColor = 'var(--lote-drop-bg)'
                e.currentTarget.style.borderColor = 'var(--lote-line)'
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept={FORMATOS_ACEITOS}
                onChange={handleInputChange}
                className="hidden"
                disabled={disabled}
              />

              {/* Cantos tipo "scan" */}
              {[
                'top-2.5 left-2.5 border-l-2 border-t-2 rounded-tl-md',
                'top-2.5 right-2.5 border-r-2 border-t-2 rounded-tr-md',
                'bottom-2.5 left-2.5 border-l-2 border-b-2 rounded-bl-md',
                'bottom-2.5 right-2.5 border-r-2 border-b-2 rounded-br-md',
              ].map((pos) => (
                <span
                  key={pos}
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute w-3.5 h-3.5 transition-colors duration-300',
                    pos
                  )}
                  style={{
                    borderColor: arrastando
                      ? 'var(--lote-accent)'
                      : 'var(--lote-line)',
                  }}
                />
              ))}

              <div className="relative px-6 py-9 text-center">
                {/* Ícone com halo */}
                <div className="relative w-14 h-14 mx-auto mb-4">
                  <div
                    className="absolute inset-0 rounded-2xl blur-lg transition-opacity duration-300"
                    style={{
                      backgroundColor: arrastando
                        ? 'var(--lote-accent-halo)'
                        : 'var(--lote-drop-halo)',
                      opacity: arrastando ? 0.9 : 0.6,
                    }}
                  />
                  <div
                    className="relative w-full h-full rounded-2xl flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: arrastando
                        ? 'var(--lote-accent)'
                        : 'var(--lote-drop-bg)',
                      border: `1px solid ${
                        arrastando ? 'var(--lote-accent)' : 'var(--lote-line)'
                      }`,
                      boxShadow: arrastando
                        ? `0 6px 18px var(--lote-accent-glow)`
                        : '0 4px 14px rgba(15,76,92,0.07)',
                      transform: arrastando ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <Upload
                      className={cn(
                        'w-6 h-6 transition-colors duration-300',
                        arrastando
                          ? 'text-white'
                          : 'text-slate-400 dark:text-petrol-300/60 group-hover:text-petrol-600 dark:group-hover:text-petrol-300'
                      )}
                    />
                  </div>
                </div>

                <p className="text-[14.5px] font-semibold text-slate-900 dark:text-white tracking-tight transition-colors">
                  {arrastando
                    ? 'Solte o arquivo para importar'
                    : 'Arraste sua planilha aqui'}
                </p>

                <p className="text-[11.5px] text-slate-500 dark:text-petrol-300/60 mt-1 transition-colors">
                  ou{' '}
                  <span
                    className="font-semibold"
                    style={{ color: 'var(--lote-ink)' }}
                  >
                    selecione do seu computador
                  </span>
                </p>

                {/* CTA visual */}
                <div className="mt-5">
                  <span
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[11.5px] font-semibold text-white transition-all duration-200 group-hover:brightness-110"
                    style={{ backgroundColor: 'var(--lote-hero-bg)' }}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Selecionar arquivo
                  </span>
                </div>

                {/* Rodapé de formatos */}
                <div
                  className="mt-6 pt-3.5 border-t border-dashed"
                  style={{ borderColor: 'var(--lote-line)' }}
                >
                  <p
                    className="text-[10px] font-mono tracking-[0.12em] uppercase transition-colors"
                    style={{ color: 'var(--lote-muted)' }}
                  >
                    XLSX · XLS · CSV · até {TAMANHO_MAX_MB} MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div key="arquivo" className="lote-state-in">
              {/* Container + faixa de validação */}
              <div
                className="rounded-md overflow-hidden bg-white dark:bg-petrol-950 transition-colors"
                style={{ border: '1px solid var(--lote-line)' }}
              >
                <div
                  className="flex items-center gap-3.5 px-4 py-4 transition-colors"
                  style={{ backgroundColor: 'var(--lote-soft-bg)' }}
                >
                  {/* Ícone do arquivo */}
                  <div
                    className="w-11 h-11 rounded-md flex items-center justify-center shrink-0 transition-colors"
                    style={{ backgroundColor: 'var(--lote-hero-bg)' }}
                  >
                    <FileSpreadsheet
                      className="w-5 h-5 transition-colors"
                      style={{ color: 'var(--lote-accent-halo)' }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13px] font-semibold font-mono truncate transition-colors"
                      style={{ color: 'var(--lote-ink)' }}
                    >
                      {arquivo.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-petrol-300/60 transition-colors">
                      <span className="font-mono">
                        {formatarTamanho(arquivo.size)}
                      </span>
                      <span
                        className="text-slate-400 dark:text-petrol-300/40 transition-colors"
                        aria-hidden
                      >
                        ·
                      </span>
                      <span
                        className="font-mono text-[10px] uppercase tracking-wider transition-colors"
                        style={{ color: 'var(--lote-ink)' }}
                      >
                        {extrairExtensao(arquivo.name)}
                      </span>
                      <span
                        className="text-slate-400 dark:text-petrol-300/40 transition-colors"
                        aria-hidden
                      >
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold transition-colors">
                        <CheckCircle2 className="w-3 h-3" />
                        Pronto para importar
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLimpar}
                    disabled={disabled}
                    aria-label="Remover arquivo"
                    className="p-1.5 text-slate-400 dark:text-petrol-300/60 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Faixa de validação */}
                <div className="px-4 py-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center gap-2 text-[10.5px] text-slate-600 dark:text-petrol-200/80 transition-colors">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 transition-colors" />
                  <span>
                    Estrutura reconhecida —{' '}
                    <span
                      className="font-mono font-semibold transition-colors"
                      style={{ color: 'var(--lote-ink)' }}
                    >
                      A
                    </span>{' '}
                    Placa ·{' '}
                    <span
                      className="font-mono font-semibold transition-colors"
                      style={{ color: 'var(--lote-ink)' }}
                    >
                      B
                    </span>{' '}
                    Chassi
                  </span>
                </div>
              </div>

              {!disabled && (
                <p className="text-[10.5px] text-slate-500 dark:text-petrol-300/60 mt-2.5 leading-relaxed transition-colors">
                  Clique em{' '}
                  <span className="font-semibold text-slate-700 dark:text-petrol-100">
                    Iniciar consulta
                  </span>{' '}
                  para processar {formatarTamanho(arquivo.size)} de dados no
                  DETRAN-CE.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Erro */}
        {erro && (
          <div
            key={erro}
            className="lote-state-in flex items-start gap-3 rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/30 px-4 py-3 transition-colors"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 transition-colors" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-[0.14em] transition-colors">
                Arquivo não aceito
              </div>
              <p className="text-[11.5px] text-rose-900/90 dark:text-rose-300/90 mt-0.5 leading-relaxed transition-colors">
                {erro}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}