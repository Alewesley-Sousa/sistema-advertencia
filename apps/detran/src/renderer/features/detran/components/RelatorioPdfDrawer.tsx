// apps/detran/src/renderer/features/detran/components/RelatorioPdfDrawer.tsx
//
// Configurador do relatório em PDF: o usuário escolhe quais veículos, o escopo,
// quais blocos entram (resumo, multas, IPVA, licenciamento), como agrupar e
// ordenar, e vê uma prévia do que o documento conterá antes de gerar.

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, FileText, Loader2, X } from 'lucide-react'
import { Drawer } from '../../../shared/ui/Drawer'
import {
  AGRUPAMENTOS_RELATORIO,
  CONFIG_PADRAO_RELATORIO,
  ESCOPOS_RELATORIO,
  ORDENACOES_MULTAS,
  ORDENACOES_VEICULOS,
  ROTULOS_AGRUPAMENTO,
  ROTULOS_ESCOPO,
  ROTULOS_ORDENACAO_MULTAS,
  ROTULOS_ORDENACAO_VEICULOS,
  type OrigemRelatorio,
  type RelatorioPdfConfig,
  type SecoesRelatorio,
  type SelecaoRelatorio,
} from '../../../../shared/relatorioContrato'
import { useGerarRelatorioPdf, usePreviaRelatorio } from '../hooks/useRelatorioPdf'

export interface OpcaoSelecaoRelatorio {
  id: string
  rotulo: string
  descricao: string
  selecao: SelecaoRelatorio
}

interface RelatorioPdfDrawerProps {
  aberto: boolean
  onFechar: () => void
  origem: OrigemRelatorio
  /** Formas de escolher os veículos. Com mais de uma, o usuário escolhe. */
  opcoesSelecao: OpcaoSelecaoRelatorio[]
  /** Chamado após o PDF ser gerado com sucesso. */
  onGerado?: () => void
}

const SECOES: Array<{ chave: keyof SecoesRelatorio; titulo: string; descricao: string }> = [
  { chave: 'resumoConsolidado', titulo: 'Resumo consolidado', descricao: 'Indicadores, quadro por contrato e evolução mensal.' },
  { chave: 'multasDetalhadas', titulo: 'Multas detalhadas', descricao: 'AIT, motivo, datas, valores e situação do boleto.' },
  { chave: 'ipva', titulo: 'IPVA', descricao: 'Situação do IPVA de cada veículo.' },
  { chave: 'licenciamento', titulo: 'Licenciamento', descricao: 'Situação do licenciamento de cada veículo.' },
]

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const num = new Intl.NumberFormat('pt-BR')

const LABEL = 'block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-petrol-300/70 mb-2'
const SELECT =
  'w-full h-9 rounded-md border border-slate-200 dark:border-petrol-700 bg-white dark:bg-petrol-950 px-2.5 text-[12.5px] text-slate-800 dark:text-petrol-100 focus:outline-none focus:ring-2 focus:ring-accent-500/50'
const INPUT =
  'w-full rounded-md border border-slate-200 dark:border-petrol-700 bg-white dark:bg-petrol-950 px-2.5 py-2 text-[12.5px] text-slate-800 dark:text-petrol-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50'

function Radio({ marcado, onChange, titulo, descricao }: { marcado: boolean; onChange: () => void; titulo: string; descricao: string }) {
  return (
    <label
      className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
        marcado
          ? 'border-petrol-600 bg-petrol-50/70 dark:border-accent-500/70 dark:bg-petrol-800/50'
          : 'border-slate-200 dark:border-petrol-700 hover:bg-slate-50 dark:hover:bg-petrol-800/40'
      }`}
    >
      <input type="radio" checked={marcado} onChange={onChange} className="mt-0.5 accent-[#1B426C]" />
      <span>
        <span className="block text-[12.5px] font-semibold text-slate-800 dark:text-petrol-50">{titulo}</span>
        <span className="block text-[11.5px] text-slate-500 dark:text-petrol-300/80">{descricao}</span>
      </span>
    </label>
  )
}

export function RelatorioPdfDrawer({ aberto, onFechar, origem, opcoesSelecao, onGerado }: RelatorioPdfDrawerProps) {
  const [opcaoId, setOpcaoId] = useState(opcoesSelecao[0]?.id ?? '')
  const [escopo, setEscopo] = useState(CONFIG_PADRAO_RELATORIO.escopo)
  const [secoes, setSecoes] = useState<SecoesRelatorio>({ ...CONFIG_PADRAO_RELATORIO.secoes })
  const [agrupamento, setAgrupamento] = useState(CONFIG_PADRAO_RELATORIO.agrupamento)
  const [ordenacaoVeiculos, setOrdenacaoVeiculos] = useState(CONFIG_PADRAO_RELATORIO.ordenacaoVeiculos)
  const [ordenacaoMultas, setOrdenacaoMultas] = useState(CONFIG_PADRAO_RELATORIO.ordenacaoMultas)
  const [titulo, setTitulo] = useState('')
  const [observacao, setObservacao] = useState('')

  const { gerando, erro, gerar, limparErro } = useGerarRelatorioPdf()

  // Ao abrir, volta para a primeira opção (a mais específica) e limpa erros antigos.
  useEffect(() => {
    if (aberto) {
      setOpcaoId(opcoesSelecao[0]?.id ?? '')
      limparErro()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  const opcao = opcoesSelecao.find((o) => o.id === opcaoId) ?? opcoesSelecao[0]

  const config: RelatorioPdfConfig | null = useMemo(() => {
    if (!opcao) return null
    return {
      origem,
      selecao: opcao.selecao,
      escopo,
      secoes,
      agrupamento,
      ordenacaoVeiculos,
      ordenacaoMultas,
      titulo: titulo.trim() || undefined,
      observacao: observacao.trim() || undefined,
    }
  }, [opcao, origem, escopo, secoes, agrupamento, ordenacaoVeiculos, ordenacaoMultas, titulo, observacao])

  const algumaSecao = Object.values(secoes).some(Boolean)
  const { previa, carregando: carregandoPrevia, erro: erroPrevia } = usePreviaRelatorio(config, aberto && algumaSecao)

  const semVeiculos = previa != null && previa.veiculos === 0
  const podeGerar = !!config && algumaSecao && !gerando && !semVeiculos && !erroPrevia

  const alternarSecao = (chave: keyof SecoesRelatorio) =>
    setSecoes((s) => ({ ...s, [chave]: !s[chave] }))

  const handleGerar = async () => {
    if (!config || !podeGerar) return
    if (await gerar(config)) {
      onGerado?.()
      onFechar()
    }
  }

  return (
    <Drawer open={aberto} onClose={onFechar} maxWidth="520px">
      <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-slate-200 dark:border-petrol-800">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-petrol-600 dark:text-accent-500" />
            <h2 className="text-[15px] font-bold text-petrol-700 dark:text-white">Relatório em PDF</h2>
          </div>
          <p className="text-[12px] text-slate-500 dark:text-petrol-300/80 mt-1">
            Escolha o que entra no documento. A prévia mostra o conteúdo antes de gerar.
          </p>
        </div>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-petrol-800 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {opcoesSelecao.length > 1 ? (
          <section>
            <span className={LABEL}>Veículos</span>
            <div className="space-y-2">
              {opcoesSelecao.map((o) => (
                <Radio key={o.id} marcado={o.id === opcao?.id} onChange={() => setOpcaoId(o.id)} titulo={o.rotulo} descricao={o.descricao} />
              ))}
            </div>
          </section>
        ) : (
          opcao && (
            <section>
              <span className={LABEL}>Veículos</span>
              <p className="text-[12.5px] text-slate-700 dark:text-petrol-100">
                <b>{opcao.rotulo}</b> — {opcao.descricao}
              </p>
            </section>
          )
        )}

        <section>
          <span className={LABEL}>Quais veículos entram</span>
          <div className="space-y-2">
            {ESCOPOS_RELATORIO.map((e) => (
              <Radio key={e} marcado={escopo === e} onChange={() => setEscopo(e)} titulo={ROTULOS_ESCOPO[e].titulo} descricao={ROTULOS_ESCOPO[e].descricao} />
            ))}
          </div>
        </section>

        <section>
          <span className={LABEL}>Conteúdo</span>
          <div className="space-y-1.5">
            {SECOES.map((s) => (
              <label key={s.chave} className="flex items-start gap-2.5 px-1 py-1 cursor-pointer">
                <input type="checkbox" checked={secoes[s.chave]} onChange={() => alternarSecao(s.chave)} className="mt-0.5 accent-[#1B426C]" />
                <span>
                  <span className="block text-[12.5px] font-semibold text-slate-800 dark:text-petrol-50">{s.titulo}</span>
                  <span className="block text-[11.5px] text-slate-500 dark:text-petrol-300/80">{s.descricao}</span>
                </span>
              </label>
            ))}
          </div>
          {!algumaSecao && (
            <p className="mt-2 text-[11.5px] text-rose-600 dark:text-rose-300">Ative ao menos uma seção do relatório.</p>
          )}
        </section>

        <section>
          <span className={LABEL}>Organização</span>
          <div className="space-y-2 mb-3">
            {AGRUPAMENTOS_RELATORIO.map((a) => (
              <Radio key={a} marcado={agrupamento === a} onChange={() => setAgrupamento(a)} titulo={ROTULOS_AGRUPAMENTO[a].titulo} descricao={ROTULOS_AGRUPAMENTO[a].descricao} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[11.5px] text-slate-500 dark:text-petrol-300/80 mb-1">Ordenar veículos</span>
              <select
                className={SELECT + (agrupamento === 'LISTA_UNICA' ? ' opacity-50' : '')}
                value={ordenacaoVeiculos}
                disabled={agrupamento === 'LISTA_UNICA'}
                onChange={(e) => setOrdenacaoVeiculos(e.target.value as typeof ordenacaoVeiculos)}
              >
                {ORDENACOES_VEICULOS.map((o) => (
                  <option key={o} value={o}>{ROTULOS_ORDENACAO_VEICULOS[o]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[11.5px] text-slate-500 dark:text-petrol-300/80 mb-1">Ordenar multas</span>
              <select className={SELECT} value={ordenacaoMultas} onChange={(e) => setOrdenacaoMultas(e.target.value as typeof ordenacaoMultas)}>
                {ORDENACOES_MULTAS.map((o) => (
                  <option key={o} value={o}>{ROTULOS_ORDENACAO_MULTAS[o]}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section>
          <span className={LABEL}>Identificação (opcional)</span>
          <input className={INPUT + ' mb-2'} placeholder="Título (padrão: Relatório de débitos e multas)" maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <textarea className={INPUT + ' resize-none'} rows={2} placeholder="Observação exibida no cabeçalho" maxLength={500} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </section>
      </div>

      <footer className="border-t border-slate-200 dark:border-petrol-800 px-6 py-4 space-y-3 bg-slate-50/60 dark:bg-petrol-950/40">
        <div className="text-[12px] text-slate-600 dark:text-petrol-200 min-h-[34px]" aria-live="polite">
          {erroPrevia ? (
            <span className="text-rose-600 dark:text-rose-300">{erroPrevia}</span>
          ) : previa ? (
            <div className={carregandoPrevia ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              {semVeiculos ? (
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Nenhum dos {num.format(previa.veiculosSelecionados)} veículo(s) atende ao escopo escolhido.
                </span>
              ) : (
                <>
                  <b>{num.format(previa.veiculos)}</b> veículo(s) · <b>{num.format(previa.multasAtivas)}</b> multa(s) ativa(s) ·{' '}
                  <b>{brl.format(previa.valorTotalMultas)}</b>
                  {previa.veiculos < previa.veiculosSelecionados && (
                    <span className="block text-[11px] text-slate-500 dark:text-petrol-300/70">
                      {num.format(previa.veiculosSelecionados - previa.veiculos)} fora do escopo escolhido.
                    </span>
                  )}
                </>
              )}
            </div>
          ) : carregandoPrevia ? (
            <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculando prévia…</span>
          ) : null}
        </div>

        {erro && (
          <div role="alert" className="rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-[12px] text-rose-700 dark:text-rose-300">
            {erro}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onFechar} className="px-3 py-2 rounded-md text-[12px] font-semibold text-slate-600 dark:text-petrol-200 hover:bg-slate-100 dark:hover:bg-petrol-800 cursor-pointer transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGerar}
            disabled={!podeGerar}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[12px] font-semibold text-white bg-petrol-600 dark:bg-petrol-500 hover:bg-petrol-700 dark:hover:bg-petrol-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            {gerando ? 'Gerando PDF…' : 'Gerar PDF'}
          </button>
        </div>
      </footer>
    </Drawer>
  )
}
