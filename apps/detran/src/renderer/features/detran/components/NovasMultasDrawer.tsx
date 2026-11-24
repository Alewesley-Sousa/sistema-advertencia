// apps/detran/src/renderer/features/detran/components/NovasMultasDrawer.tsx
//
// Painel da verificação de multas novas: mostra o agendamento, as multas ainda
// não avisadas (com seleção), permite marcar/desmarcar manualmente e rodar agora.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, CheckCheck, Loader2, Play, Undo2, X } from 'lucide-react'
import { Drawer } from '../../../shared/ui/Drawer'
import { showToast } from '../../../shared/ui/Toast'
import {
  buscarStatusNovasMultas,
  executarNovasMultasAgora,
  listarPendentesNovasMultas,
  marcarNovasMultas,
  type ExecucaoNovasMultas,
  type MultaPendente,
  type StatusNovasMultas,
} from '../services/detran'

const ROTULO_STATUS: Record<ExecucaoNovasMultas['status'], { texto: string; classe: string }> = {
  EXECUTANDO: { texto: 'Executando', classe: 'bg-sky-50 text-sky-800 border-sky-200' },
  CONCLUIDA: { texto: 'Concluída', classe: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  PARCIAL: { texto: 'Parcial', classe: 'bg-amber-50 text-amber-800 border-amber-200' },
  FALHA: { texto: 'Falha', classe: 'bg-rose-50 text-rose-800 border-rose-200' },
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR')
}

export function NovasMultasDrawer({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const [status, setStatus] = useState<StatusNovasMultas | null>(null)
  const [pendentes, setPendentes] = useState<MultaPendente[]>([])
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set())
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([buscarStatusNovasMultas(), listarPendentesNovasMultas()])
      setStatus(s)
      setPendentes(p)
      setSelecionadas((atual) => new Set([...atual].filter((id) => p.some((m) => m.id === id))))
      setErro(null)
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar o estado das multas novas.')
    }
  }, [])

  useEffect(() => {
    if (aberto) carregar()
  }, [aberto, carregar])

  useEffect(() => {
    if (!aberto || !status?.emExecucao) return
    const t = window.setInterval(carregar, 2000)
    return () => window.clearInterval(t)
  }, [aberto, status?.emExecucao, carregar])

  const porVeiculo = useMemo(() => {
    const mapa = new Map<string, MultaPendente[]>()
    for (const m of pendentes) mapa.set(m.placa, [...(mapa.get(m.placa) ?? []), m])
    return [...mapa.entries()]
  }, [pendentes])

  const alternar = (id: number) =>
    setSelecionadas((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })

  const alternarVeiculo = (itens: MultaPendente[]) =>
    setSelecionadas((atual) => {
      const novo = new Set(atual)
      const todas = itens.every((m) => novo.has(m.id))
      for (const m of itens) {
        if (todas) novo.delete(m.id)
        else novo.add(m.id)
      }
      return novo
    })

  const executarAcao = async (fn: () => Promise<{ alteradas: number }>, msg: (n: number) => string) => {
    setOcupado(true)
    try {
      const r = await fn()
      showToast.success(msg(r.alteradas))
      setSelecionadas(new Set())
      await carregar()
    } catch (err: any) {
      showToast.error(err?.message || 'Não foi possível concluir a ação.')
    } finally {
      setOcupado(false)
    }
  }

  const handleMarcarSelecionadas = () =>
    executarAcao(
      () => marcarNovasMultas({ acao: 'MARCAR', ids: [...selecionadas] }),
      (n) => `${n} multa(s) marcada(s) como avisada(s).`
    )

  const handleMarcarTodas = () => {
    if (!window.confirm(`Marcar as ${pendentes.length} multa(s) pendente(s) como já avisadas? Elas não serão enviadas por e-mail.`)) return
    return executarAcao(
      () => marcarNovasMultas({ acao: 'MARCAR', todasPendentes: true }),
      (n) => `${n} multa(s) marcada(s) como avisada(s).`
    )
  }

  const handleExecutar = async () => {
    setOcupado(true)
    try {
      await executarNovasMultasAgora()
      showToast.success('Verificação iniciada. O e-mail sai ao final, se houver multas novas.')
      await carregar()
    } catch (err: any) {
      showToast.error(err?.message || 'Não foi possível iniciar a verificação.')
    } finally {
      setOcupado(false)
    }
  }

  const podeExecutar = !!status?.ativa && !!status?.cofre.existe && !status?.emExecucao && !ocupado
  const rotulo = 'block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-petrol-300/70'
  const botao =
    'inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-[12px] font-semibold border border-slate-200 dark:border-petrol-700 bg-white dark:bg-petrol-900 hover:bg-slate-50 dark:hover:bg-petrol-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors'

  return (
    <Drawer open={aberto} onClose={onFechar} maxWidth="520px">
      <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-slate-200 dark:border-petrol-800">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-petrol-600 dark:text-accent-500" />
            <h2 className="text-[15px] font-bold text-petrol-700 dark:text-white">Multas novas</h2>
          </div>
          <p className="text-[12px] text-slate-500 dark:text-petrol-300/80 mt-1">
            Consulta a lista salva e envia por e-mail apenas as multas que ainda não foram avisadas.
          </p>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-petrol-800 cursor-pointer transition-colors">
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-[12.5px] text-slate-700 dark:text-petrol-100">
        {erro && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{erro}</div>}

        <section className="space-y-1">
          <span className={rotulo}>Agendamento</span>
          {status?.ativa ? (
            <>
              <p>
                A cada <b>{status.intervaloHoras} h</b>, ancorado em <b>{status.horario}</b> ({status.timezone}).
              </p>
              <p>Próxima verificação: <b>{formatarData(status.proxima)}</b></p>
              {!status.cofre.existe && (
                <p className="text-amber-700 dark:text-amber-300">
                  Nenhuma lista de veículos importada. Importe pela “Automação semanal”.
                </p>
              )}
            </>
          ) : (
            <p className="text-amber-700 dark:text-amber-300">
              Desligado. Defina <code>NOVAS_MULTAS_ATIVA=true</code>, o SMTP e os destinatários no <code>.env</code> do servidor e reinicie.
            </p>
          )}
        </section>

        <section className="space-y-2">
          <span className={rotulo}>Execução</span>
          <button type="button" disabled={!podeExecutar} onClick={handleExecutar} className={botao}>
            {status?.emExecucao ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {status?.emExecucao ? 'Verificando…' : 'Rodar agora'}
          </button>
          <p className="text-[11.5px] text-slate-500 dark:text-petrol-300/80">
            Veículos vistos pela primeira vez entram em silêncio: as multas que já existem são registradas como avisadas (BASE) e só as próximas geram e-mail.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={rotulo}>Ainda não avisadas ({pendentes.length})</span>
            <div className="flex gap-2">
              <button type="button" disabled={ocupado || !selecionadas.size} onClick={handleMarcarSelecionadas} className={botao}>
                <CheckCheck className="w-3.5 h-3.5" /> Marcar selecionadas
              </button>
              <button type="button" disabled={ocupado || !pendentes.length} onClick={handleMarcarTodas} className={botao}>
                Marcar todas
              </button>
            </div>
          </div>
          {porVeiculo.length ? (
            <ul className="space-y-2">
              {porVeiculo.map(([placa, itens]) => (
                <li key={placa} className="rounded-md border border-slate-200 dark:border-petrol-800">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-petrol-900 cursor-pointer">
                    <input type="checkbox" checked={itens.every((m) => selecionadas.has(m.id))} onChange={() => alternarVeiculo(itens)} />
                    <span className="font-mono font-semibold">{placa}</span>
                    <span className="text-slate-500 dark:text-petrol-300/80 truncate">
                      {[itens[0].modelo, itens[0].contrato].filter(Boolean).join(' · ')}
                    </span>
                  </label>
                  <ul className="divide-y divide-slate-100 dark:divide-petrol-800">
                    {itens.map((m) => (
                      <li key={m.id}>
                        <label className="flex items-start gap-2 px-3 py-2 cursor-pointer">
                          <input type="checkbox" className="mt-0.5" checked={selecionadas.has(m.id)} onChange={() => alternar(m.id)} />
                          <span className="min-w-0">
                            <span className="block font-mono text-[11px] text-slate-500">{m.ait} · {m.dataInfracao}</span>
                            <span className="block truncate">{m.motivo}</span>
                            <span className="block text-[11.5px] text-slate-500">
                              Vence: {m.dataVencimento ?? '—'} · Valor: {m.valorPagar ?? '—'}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 dark:text-petrol-300/80">Nenhuma multa pendente de aviso.</p>
          )}
          <p className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500 dark:text-petrol-300/80">
            <Undo2 className="w-3 h-3" /> Para voltar uma multa a “nova”, desmarque-a na tela de multas do veículo.
          </p>
        </section>

        <section className="space-y-2">
          <span className={rotulo}>Últimas execuções</span>
          {status?.execucoes.length ? (
            <ul className="space-y-2">
              {status.execucoes.map((x) => (
                <li key={x.id} className="rounded-md border border-slate-200 dark:border-petrol-800 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{formatarData(x.iniciadaEm)} · {x.origem === 'AGENDADA' ? 'Agendada' : 'Manual'}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${ROTULO_STATUS[x.status].classe}`}>{ROTULO_STATUS[x.status].texto}</span>
                  </div>
                  <div className="text-[11.5px] text-slate-500 dark:text-petrol-300/80 mt-0.5">
                    {x.totalVeiculos} veículo(s) · {x.comErro} com erro · {x.novas} nova(s) · e-mail {x.emailEnviado ? 'enviado' : 'não enviado'}
                  </div>
                  {x.executadoPor && <div className="text-[11.5px] text-slate-500 dark:text-petrol-300/80 mt-0.5">Executado por: {x.executadoPor}</div>}
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
