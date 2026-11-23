// apps/detran/src/renderer/features/detran/components/AutomacaoSemanalDrawer.tsx
//
// Painel da automação semanal: importar a lista (guardada cifrada no servidor),
// ver o estado e o histórico e disparar uma execução manual. Nenhuma placa,
// chassi ou e-mail volta do servidor — só contagens.

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { CalendarClock, Loader2, Lock, Mail, Play, Trash2, Upload, X } from 'lucide-react'
import { Drawer } from '../../../shared/ui/Drawer'
import { showToast } from '../../../shared/ui/Toast'
import { lerPlanilhaVeiculos } from '../lib/lerPlanilhaVeiculos'
import {
  buscarStatusAutomacao,
  executarAutomacaoAgora,
  importarVeiculosAutomacao,
  reenviarEmailAutomacao,
  removerVeiculosAutomacao,
  type ExecucaoAutomacao,
  type StatusAutomacao,
} from '../services/detran'

const ROTULO_STATUS: Record<ExecucaoAutomacao['status'], { texto: string; classe: string }> = {
  EXECUTANDO: { texto: 'Executando', classe: 'bg-sky-50 text-sky-800 border-sky-200' },
  CONCLUIDA: { texto: 'Concluída', classe: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  PARCIAL: { texto: 'Parcial', classe: 'bg-amber-50 text-amber-800 border-amber-200' },
  FALHA: { texto: 'Falha', classe: 'bg-rose-50 text-rose-800 border-rose-200' },
}

const ROTULO_FASE = {
  CARREGANDO: 'Preparando…',
  CONSULTANDO: 'Consultando o DETRAN-CE',
  GERANDO_PDF: 'Gerando o PDF',
  ENVIANDO_EMAIL: 'Enviando o e-mail',
} as const

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function descreverCron(cron: string | null): string {
  const m = cron?.trim().match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+(\d)$/)
  if (!m) return cron ?? '—'
  return `toda ${DIAS[Number(m[3]) % 7]}-feira às ${m[2].padStart(2, '0')}:${m[1].padStart(2, '0')}`
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR')
}

export function AutomacaoSemanalDrawer({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const [status, setStatus] = useState<StatusAutomacao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    try {
      setStatus(await buscarStatusAutomacao())
      setErro(null)
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar o estado da automação.')
    }
  }, [])

  useEffect(() => {
    if (!aberto) return
    carregar()
  }, [aberto, carregar])

  // Enquanto há execução em andamento, atualiza a cada 2 s.
  useEffect(() => {
    if (!aberto || !status?.emExecucao) return
    const t = window.setInterval(carregar, 2000)
    return () => window.clearInterval(t)
  }, [aberto, status?.emExecucao, carregar])

  const handleArquivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setOcupado(true)
    try {
      const linhas = await lerPlanilhaVeiculos(arquivo)
      if (!linhas.length) {
        showToast.error('Nenhum veículo válido na planilha. É preciso ter as colunas "placa" e "chassi" (ou "renavam").')
        return
      }
      const r = await importarVeiculosAutomacao(linhas)
      showToast.success(
        `${r.total} veículo(s) guardados com criptografia` +
          (r.duplicadas ? ` · ${r.duplicadas} duplicada(s) ignorada(s)` : '') +
          (r.rejeitadas ? ` · ${r.rejeitadas} linha(s) inválida(s)` : '')
      )
      await carregar()
    } catch (err: any) {
      showToast.error(err?.message || 'Não foi possível importar a lista.')
    } finally {
      setOcupado(false)
    }
  }

  const handleExecutar = async () => {
    setOcupado(true)
    try {
      await executarAutomacaoAgora()
      showToast.success('Execução iniciada. O relatório será enviado por e-mail ao final.')
      await carregar()
    } catch (err: any) {
      showToast.error(err?.message || 'Não foi possível iniciar a execução.')
    } finally {
      setOcupado(false)
    }
  }

  const handleReenviar = async () => {
    setOcupado(true)
    try {
      await reenviarEmailAutomacao()
      showToast.success('Reenvio iniciado, sem nova consulta ao DETRAN.')
      await carregar()
    } catch (err: any) {
      showToast.error(err?.message || 'Não foi possível reenviar o e-mail.')
    } finally {
      setOcupado(false)
    }
  }

  const handleRemover = async () => {
    if (!window.confirm('Remover a lista de veículos guardada? A automação não rodará até uma nova importação.')) return
    setOcupado(true)
    try {
      await removerVeiculosAutomacao()
      await carregar()
    } catch (err: any) {
      showToast.error(err?.message || 'Não foi possível remover a lista.')
    } finally {
      setOcupado(false)
    }
  }

  const podeExecutar = !!status?.agendada && !!status?.cofre.existe && !status?.emExecucao && !ocupado

  return (
    <Drawer open={aberto} onClose={onFechar} maxWidth="480px">
      <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-slate-200 dark:border-petrol-800">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-petrol-600 dark:text-accent-500" />
            <h2 className="text-[15px] font-bold text-petrol-700 dark:text-white">Automação semanal</h2>
          </div>
          <p className="text-[12px] text-slate-500 dark:text-petrol-300/80 mt-1">
            Consulta a lista salva, gera o PDF e envia por e-mail aos destinatários configurados no servidor.
          </p>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-petrol-800 cursor-pointer transition-colors">
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-[12.5px] text-slate-700 dark:text-petrol-100">
        {erro && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{erro}</div>}

        <section className="space-y-1">
          <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-petrol-300/70">Agendamento</span>
          {status?.agendada ? (
            <p>Ativo: <b>{descreverCron(status.cron)}</b> ({status.timezone}).</p>
          ) : (
            <p className="text-amber-700 dark:text-amber-300">
              Desligado. Defina <code>DETRAN_AUTOMACAO_ATIVA=true</code>, o SMTP e os destinatários no <code>.env</code> do servidor e reinicie.
            </p>
          )}
        </section>

        <section className="space-y-2">
          <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-petrol-300/70">Lista de veículos</span>
          <p className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-petrol-600 dark:text-accent-500" />
            {status?.cofre.existe
              ? <>{status.cofre.total} veículo(s) guardados com criptografia · atualizada em {formatarData(status.cofre.atualizadoEm)}</>
              : 'Nenhuma lista importada.'}
          </p>
          <p className="text-[11.5px] text-slate-500 dark:text-petrol-300/80">
            A planilha precisa das colunas <b>placa</b> e <b>chassi</b> (ou renavam); <b>modelo</b> e <b>contrato</b> são opcionais. Por segurança, a lista nunca é exibida de volta.
          </p>
          <div className="flex flex-wrap gap-2">
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleArquivo} />
            <button type="button" disabled={ocupado} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-[12px] font-semibold text-white bg-petrol-600 dark:bg-petrol-500 hover:bg-petrol-700 dark:hover:bg-petrol-600 disabled:opacity-40 cursor-pointer transition-colors">
              {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {status?.cofre.existe ? 'Substituir lista' : 'Importar lista'}
            </button>
            {status?.cofre.existe && (
              <button type="button" disabled={ocupado} onClick={handleRemover} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-[12px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40 cursor-pointer transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Remover
              </button>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-petrol-300/70">Execução</span>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={!podeExecutar} onClick={handleExecutar} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-[12px] font-semibold border border-slate-200 dark:border-petrol-700 bg-white dark:bg-petrol-900 hover:bg-slate-50 dark:hover:bg-petrol-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
              {status?.emExecucao && !status.progresso?.reenvio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {status?.emExecucao && !status.progresso?.reenvio ? 'Executando…' : 'Executar agora'}
            </button>
            <button type="button" disabled={!podeExecutar} onClick={handleReenviar} title="Usa os dados já consultados; não acessa o DETRAN de novo." className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-[12px] font-semibold border border-slate-200 dark:border-petrol-700 bg-white dark:bg-petrol-900 hover:bg-slate-50 dark:hover:bg-petrol-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
              {status?.emExecucao && status.progresso?.reenvio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              {status?.emExecucao && status.progresso?.reenvio ? 'Reenviando…' : 'Reenviar e-mail'}
            </button>
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-petrol-300/80">
            “Reenviar e-mail” gera o PDF com os dados da última consulta e envia de novo, sem buscar no DETRAN.
          </p>
          {status?.emExecucao && status.progresso && (
            <div className="space-y-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={status.progresso.percentual}>
              <div className="flex items-center justify-between text-[11.5px] text-slate-600 dark:text-petrol-200">
                <span>
                  {ROTULO_FASE[status.progresso.fase]}
                  {status.progresso.fase === 'CONSULTANDO' && ` · ${status.progresso.processados}/${status.progresso.total}`}
                </span>
                <span className="font-semibold tabular-nums">{status.progresso.percentual}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-petrol-800 overflow-hidden">
                <div className="h-full rounded-full bg-accent-500 transition-[width] duration-500" style={{ width: `${status.progresso.percentual}%` }} />
              </div>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-petrol-300/70">Últimas execuções</span>
          {status?.execucoes.length ? (
            <ul className="space-y-2">
              {status.execucoes.map((x) => (
                <li key={x.id} className="rounded-md border border-slate-200 dark:border-petrol-800 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{formatarData(x.iniciadaEm)} · {x.origem === 'AGENDADA' ? 'Agendada' : 'Manual'}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${ROTULO_STATUS[x.status].classe}`}>{ROTULO_STATUS[x.status].texto}</span>
                  </div>
                  <div className="text-[11.5px] text-slate-500 dark:text-petrol-300/80 mt-0.5">
                    {x.totalVeiculos} veículo(s) · {x.comErro} com erro · e-mail {x.emailEnviado ? 'enviado' : 'não enviado'}
                  </div>
                  {x.executadoPor && (
                    <div className="text-[11.5px] text-slate-500 dark:text-petrol-300/80 mt-0.5">Executado por: {x.executadoPor}</div>
                  )}
                  {x.mensagem && <div className="text-[11.5px] mt-0.5">{x.mensagem}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 dark:text-petrol-300/80">Nenhuma execução ainda.</p>
          )}
        </section>
      </div>
    </Drawer>
  )
}
