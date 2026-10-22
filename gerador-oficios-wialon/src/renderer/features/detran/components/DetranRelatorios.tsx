import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react'
import {
    AlertTriangle,
    BarChart3,
    Check,
    ChevronDown,
    Filter,
    FileText,
    Loader2,
    RefreshCw,
    TicketCheck,
    TrendingUp,
    Truck,
} from 'lucide-react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import {
    buscarRelatoriosDetran,
    type RelatoriosDetran as RelatoriosDetranData,
} from '../services/detran'

const formatarNumero = (valor: number) =>
    new Intl.NumberFormat('pt-BR').format(valor)
const formatarPercentual = (valor: number, total: number) =>
    total > 0
        ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(
            (valor / total) * 100
        )
        : '0'
const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(valor)

export function DetranRelatorios() {
    const [dados, setDados] = useState<RelatoriosDetranData | null>(null)
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [atualizacao, setAtualizacao] = useState(0)
    const [paginaMultas, setPaginaMultas] = useState(1)
    const [contratosSelecionados, setContratosSelecionados] = useState<string[]>([])
    const [filtroContratosAberto, setFiltroContratosAberto] = useState(false)
    const filtroContratosRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!filtroContratosAberto) return

        const fecharAoClicarFora = (event: PointerEvent) => {
            if (!filtroContratosRef.current?.contains(event.target as Node)) {
                setFiltroContratosAberto(false)
            }
        }
        const fecharComEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setFiltroContratosAberto(false)
        }

        document.addEventListener('pointerdown', fecharAoClicarFora)
        document.addEventListener('keydown', fecharComEscape)
        return () => {
            document.removeEventListener('pointerdown', fecharAoClicarFora)
            document.removeEventListener('keydown', fecharComEscape)
        }
    }, [filtroContratosAberto])

    useEffect(() => {
        let ativo = true

        buscarRelatoriosDetran(contratosSelecionados)
            .then((resultado) => {
                if (ativo) {
                    setDados(resultado)
                    setErro(null)
                }
            })
            .catch((error: unknown) => {
                if (ativo) {
                    setErro(
                        error instanceof Error
                            ? error.message
                            : 'Não foi possível carregar os relatórios.'
                    )
                }
            })
            .finally(() => {
                if (ativo) setCarregando(false)
            })

        return () => {
            ativo = false
        }
    }, [atualizacao, contratosSelecionados])

    const atualizar = () => {
        setCarregando(true)
        setAtualizacao((valor) => valor + 1)
    }

    const alternarContrato = (contrato: string) => {
        setCarregando(true)
        setPaginaMultas(1)
        setContratosSelecionados((selecionados) =>
            selecionados.includes(contrato)
                ? selecionados.filter((item) => item !== contrato)
                : [...selecionados, contrato]
        )
    }

    const limparFiltroContratos = () => {
        setCarregando(true)
        setPaginaMultas(1)
        setContratosSelecionados([])
    }

    const multasPorVeiculo = dados?.multasPorVeiculo ?? []
    const totalPaginasMultas = Math.max(1, Math.ceil(multasPorVeiculo.length / 6))
    const paginaMultasAtual = Math.min(paginaMultas, totalPaginasMultas)
    const inicioMultas = (paginaMultasAtual - 1) * 6
    const multasDaPagina = multasPorVeiculo.slice(inicioMultas, inicioMultas + 6)

    return (
        <section className="space-y-6" aria-labelledby="detran-relatorios-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4 dark:border-petrol-800">
                <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-petrol-400/70">
                        Visão consolidada
                    </p>
                    <h2
                        id="detran-relatorios-title"
                        className="text-lg font-bold text-slate-900 dark:text-white"
                    >
                        Relatórios da frota
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-petrol-300/70">
                        Indicadores calculados sobre as consultas e multas salvas no sistema.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative" ref={filtroContratosRef}>
                        <button
                            type="button"
                            aria-haspopup="listbox"
                            aria-expanded={filtroContratosAberto}
                            onClick={() => setFiltroContratosAberto((aberto) => !aberto)}
                            className="inline-flex h-9 min-w-48 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-petrol-400 dark:border-petrol-700 dark:bg-petrol-900 dark:text-petrol-100"
                        >
                            <Filter className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 text-left">
                                {contratosSelecionados.length === 0
                                    ? 'Todos os contratos'
                                    : `${contratosSelecionados.length} contrato(s)`}
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtroContratosAberto ? 'rotate-180' : ''}`} />
                        </button>

                        {filtroContratosAberto && (
                            <div
                                role="listbox"
                                aria-label="Filtrar relatórios por contrato"
                                aria-multiselectable="true"
                                className="absolute right-0 z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-2 shadow-xl dark:border-petrol-700 dark:bg-petrol-900"
                            >
                                <div className="mb-1 flex items-center justify-between border-b border-slate-100 px-2 pb-2 dark:border-petrol-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-petrol-300/70">
                                        Selecione contratos
                                    </span>
                                    {contratosSelecionados.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={limparFiltroContratos}
                                            className="text-[10px] font-semibold text-petrol-700 hover:underline dark:text-petrol-300"
                                        >
                                            Limpar
                                        </button>
                                    )}
                                </div>
                                {dados?.contratosDisponiveis.map((contrato) => {
                                    const selecionado = contratosSelecionados.includes(contrato.id)
                                    return (
                                        <button
                                            key={contrato.id}
                                            type="button"
                                            role="option"
                                            aria-selected={selecionado}
                                            onClick={() => alternarContrato(contrato.id)}
                                            className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-petrol-100 dark:hover:bg-petrol-800/70"
                                        >
                                            <span className={`flex h-4 w-4 items-center justify-center rounded-[3px] border ${selecionado ? 'border-petrol-600 bg-petrol-600 text-white dark:border-petrol-400 dark:bg-petrol-400 dark:text-petrol-950' : 'border-slate-300 dark:border-petrol-600'}`}>
                                                {selecionado && <Check className="h-3 w-3" />}
                                            </span>
                                            <span title={contrato.id === '__SEM_CONTRATO__' ? 'Veículo sem contrato registrado na planilha' : contrato.nome}>
                                                {contrato.nome}
                                                {contrato.id === '__SEM_CONTRATO__' && (
                                                    <span className="ml-1 text-[10px] text-slate-400 dark:text-petrol-400/70">
                                                        Sem contrato registrado
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    )
                                })}
                                {dados?.contratosDisponiveis.length === 0 && (
                                    <p className="px-2 py-3 text-xs text-slate-500 dark:text-petrol-300/70">
                                        Nenhum contrato foi importado ainda.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={atualizar}
                        disabled={carregando}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-petrol-700 dark:bg-petrol-900 dark:text-petrol-100 dark:hover:bg-petrol-800"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>
            </div>

            {erro && (
                <div
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
                >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{erro}</span>
                </div>
            )}

            {carregando && !dados ? (
                <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-slate-500 dark:text-petrol-300/70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando relatórios...
                </div>
            ) : dados ? (
                <>
                    <div className="border-l-2 border-petrol-500 bg-slate-50 px-4 py-3 dark:bg-petrol-900/60">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-petrol-700 dark:text-petrol-300">
                            Leitura rápida
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-petrol-100">
                            Há <strong>{formatarNumero(dados.resumo.veiculosNoHistorico)}</strong> veículos no histórico.
                            {' '}<strong>{formatarNumero(dados.resumo.veiculosComDebitos)}</strong> têm débito de IPVA ou licenciamento confirmado,
                            {' '}e <strong>{formatarNumero(dados.resumo.multasAtivas)}</strong> multas permanecem ativas na última sincronização registrada.
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-petrol-300/70">
                            O resumo usa os dados salvos no sistema. “Informativo” e “Não identificado” não são tratados como situação regular.
                        </p>
                    </div>

                    <section aria-labelledby="relatorio-frota-title">
                        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                            <h3 id="relatorio-frota-title" className="text-sm font-bold text-slate-800 dark:text-white">
                                Situação da frota
                            </h3>
                            <span className="text-[10.5px] text-slate-500 dark:text-petrol-300/70">
                                {formatarNumero(dados.resumo.consultasConcluidas)} consultas concluídas no histórico
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Indicador
                                titulo="Veículos cadastrados"
                                valor={formatarNumero(dados.resumo.veiculosNoHistorico)}
                                detalhe="Placas consultadas e salvas"
                                Icone={Truck}
                                cor="petrol"
                            />
                            <Indicador
                                titulo="Com débito confirmado"
                                valor={formatarNumero(dados.resumo.veiculosComDebitos)}
                                detalhe={`${formatarNumero(dados.resumo.ipvaComDebito)} IPVA · ${formatarNumero(dados.resumo.licenciamentoComDebito)} licenciamento`}
                                Icone={AlertTriangle}
                                cor="rose"
                            />
                            <Indicador
                                titulo="Multas ativas"
                                valor={formatarNumero(dados.resumo.multasAtivas)}
                                detalhe={`${formatarNumero(dados.resumo.veiculosComMultas)} veículos com multas`}
                                Icone={TicketCheck}
                                cor="amber"
                            />
                            <Indicador
                                titulo="Boletos disponíveis"
                                valor={formatarNumero(dados.resumo.boletosDisponiveis)}
                                detalhe="PDFs vinculados a multas ativas"
                                Icone={FileText}
                                cor="emerald"
                            />
                        </div>
                    </section>

                    <section aria-labelledby="relatorio-financeiro-title" className="bg-slate-50 px-4 py-5 dark:bg-petrol-900/60 sm:px-5">
                        <div className="mb-4 flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                <span className="font-mono text-base font-bold">R$</span>
                            </span>
                            <div>
                                <h3 id="relatorio-financeiro-title" className="text-sm font-bold text-slate-800 dark:text-white">
                                    Valores das multas ativas
                                </h3>
                                <p className="mt-1 text-[11px] text-slate-500 dark:text-petrol-300/70">
                                    Soma dos valores informados pelo Detran para as multas que ainda aparecem como ativas.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 divide-y divide-slate-200 border-y border-slate-200 dark:divide-petrol-800 dark:border-petrol-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                            <div className="py-3 sm:pr-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-petrol-300/70">
                                    Valor da multa
                                </p>
                                <p className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white">
                                    {formatarMoeda(dados.resumo.valorTotalMultasAtivas)}
                                </p>
                                <p className="mt-1 text-[10.5px] text-slate-500 dark:text-petrol-300/70">
                                    Disponível em {formatarNumero(dados.resumo.multasComValor)} de {formatarNumero(dados.resumo.multasAtivas)} multas ativas.
                                </p>
                            </div>
                            <div className="py-3 sm:pl-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-petrol-300/70">
                                    Total para pagamento
                                </p>
                                <p className="mt-1 font-mono text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                                    {formatarMoeda(dados.resumo.valorTotalParaPagamento)}
                                </p>
                                <p className="mt-1 text-[10.5px] text-slate-500 dark:text-petrol-300/70">
                                    Disponível em {formatarNumero(dados.resumo.multasComValorPagar)} de {formatarNumero(dados.resumo.multasAtivas)} multas ativas.
                                </p>
                            </div>
                        </div>
                        <p className="mt-3 text-[10.5px] leading-relaxed text-slate-500 dark:text-petrol-300/70">
                            Multas sem valor informado ficam fora da soma. Os números refletem a consulta salva e podem mudar; não confirmam pagamento nem substituem a emissão atualizada do boleto.
                        </p>
                    </section>

                    <section aria-labelledby="relatorio-contratos-title" className="border-t border-slate-200 pt-5 dark:border-petrol-800">
                        <div className="mb-1 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                            <h3 id="relatorio-contratos-title" className="text-sm font-bold text-slate-800 dark:text-white">
                                Valor acumulado de multas ativas por contrato
                            </h3>
                        </div>
                        <p className="mb-4 text-[11px] text-slate-500 dark:text-petrol-300/70">
                            Colunas verticais mostram o valor acumulado de cada contrato. Clique em uma coluna para incluir ou remover o contrato do filtro; os totais acima são somados.
                        </p>
                        <p className="-mt-2 mb-4 text-[10px] text-slate-400 dark:text-petrol-400/70">
                            S/C = veículo sem contrato registrado na planilha.
                        </p>
                        {dados.valoresPorContrato.length > 0 ? (
                            <GraficoBarrasContratos
                                dados={dados.valoresPorContrato}
                                selecionados={contratosSelecionados}
                                onAlternar={alternarContrato}
                            />
                        ) : (
                            <p className="py-4 text-xs text-slate-500 dark:text-petrol-300/70">
                                Não há multas ativas para os contratos selecionados.
                            </p>
                        )}
                    </section>

                    <section aria-labelledby="relatorio-evolucao-title" className="border-t border-slate-200 pt-5 dark:border-petrol-800">
                        <div className="mb-1 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                            <h3 id="relatorio-evolucao-title" className="text-sm font-bold text-slate-800 dark:text-white">
                                Valor das multas ativas por mês de infração
                            </h3>
                        </div>
                        <p className="mb-4 text-[11px] text-slate-500 dark:text-petrol-300/70">
                            Cada linha é um contrato. O mês considera a data da infração; o valor soma as multas ativas com valor informado.
                        </p>
                        {dados.evolucaoMensalContratos.meses.length > 0 ? (
                            <GraficoEvolucaoMensal
                                evolucao={dados.evolucaoMensalContratos}
                                contratos={dados.valoresPorContrato}
                                selecionados={contratosSelecionados}
                            />
                        ) : (
                            <p className="py-4 text-xs text-slate-500 dark:text-petrol-300/70">
                                Não há multas ativas com data de infração para exibir.
                            </p>
                        )}
                        {dados.evolucaoMensalContratos.multasSemData > 0 && (
                            <p className="mt-3 text-[10.5px] text-slate-500 dark:text-petrol-300/70">
                                {formatarNumero(dados.evolucaoMensalContratos.multasSemData)} multa(s) ativa(s) sem data de infração legível ficaram fora do gráfico.
                            </p>
                        )}
                    </section>

                    <section aria-labelledby="relatorio-debitos-title">
                        <div className="mb-1 flex items-center gap-2">
                            <h3 id="relatorio-debitos-title" className="text-sm font-bold text-slate-800 dark:text-white">
                                Débitos de IPVA e licenciamento
                            </h3>
                        </div>
                        <p className="mb-4 text-[11px] text-slate-500 dark:text-petrol-300/70">
                            Quantidade de veículos em cada situação no histórico. Informativo e não identificado não significam regularidade.
                        </p>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-8 xl:grid-cols-2">
                            <DonutSituacao
                                titulo="IPVA"
                                total={dados.resumo.veiculosNoHistorico}
                                valores={[
                                    { rotulo: 'Com débito', valor: dados.situacoes.ipvaDebito, cor: '#e11d48' },
                                    { rotulo: 'Regular', valor: dados.situacoes.ipvaRegular, cor: '#059669' },
                                    { rotulo: 'Informativo', valor: dados.situacoes.ipvaInformativo, cor: '#d97706' },
                                    { rotulo: 'Não identificado', valor: dados.situacoes.ipvaNaoIdentificado, cor: '#94a3b8' },
                                ]}
                            />
                            <DonutSituacao
                                titulo="Licenciamento"
                                total={dados.resumo.veiculosNoHistorico}
                                valores={[
                                    { rotulo: 'Com débito', valor: dados.situacoes.licenciamentoDebito, cor: '#e11d48' },
                                    { rotulo: 'Regular', valor: dados.situacoes.licenciamentoRegular, cor: '#059669' },
                                    { rotulo: 'Informativo', valor: dados.situacoes.licenciamentoInformativo, cor: '#d97706' },
                                    { rotulo: 'Não identificado', valor: dados.situacoes.licenciamentoNaoIdentificado, cor: '#94a3b8' },
                                ]}
                            />
                        </div>
                    </section>

                    <section aria-labelledby="relatorio-multas-title" className="border-t border-slate-200 pt-5 dark:border-petrol-800">
                        <div className="mb-1 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-petrol-600 dark:text-petrol-300" />
                            <h3 id="relatorio-multas-title" className="text-sm font-bold text-slate-800 dark:text-white">
                                Multas por veículo
                            </h3>
                        </div>
                        <p className="mb-4 text-[11px] text-slate-500 dark:text-petrol-300/70">
                            Compare o que continua ativo com todo o histórico de multas já registrado para cada placa.
                        </p>

                        {multasPorVeiculo.length > 0 ? (
                            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-petrol-800 dark:bg-petrol-900">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[760px] text-left text-sm">
                                        <thead className="border-b border-slate-200 bg-petrol-800 text-[13px] uppercase tracking-wider text-slate-200 dark:border-petrol-800 dark:bg-petrol-800 dark:text-petrol-200">
                                            <tr>
                                                <th scope="col" className="px-5 py-3 font-semibold">Veículo</th>
                                                <th scope="col" className="px-5 py-3 font-semibold">Contrato</th>
                                                <th scope="col" className="px-5 py-3 font-semibold">Multas ativas</th>
                                                <th scope="col" className="px-5 py-3 font-semibold">Ativas + inativas</th>
                                            </tr>
                                        </thead>
                                        <tbody className="[&>tr:nth-child(even)]:bg-slate-50/60 dark:[&>tr:nth-child(even)]:bg-petrol-950/30">
                                            {multasDaPagina.map((item) => (
                                                <tr key={item.placa} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-100 dark:border-petrol-800/70 dark:hover:bg-petrol-800/50">
                                                    <td className="whitespace-nowrap px-5 py-3.5">
                                                        <p className="font-mono text-xs font-semibold text-slate-900 dark:text-white">{item.placa}</p>
                                                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-petrol-300/70">{item.modelo || 'Modelo não informado'}</p>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {item.contrato && item.contrato !== 'S/C' ? (
                                                            <span className="text-xs font-medium text-slate-700 dark:text-petrol-100">{item.contrato}</span>
                                                        ) : (
                                                            <span title="Veículo sem contrato registrado na planilha" className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/15 dark:bg-petrol-800 dark:text-petrol-200 dark:ring-petrol-600/30">S/C</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <ResumoMultasVeiculo quantidade={item.qtdMultasAtivas} quantidadeComValor={item.multasAtivasComValor} valor={item.valorMultasAtivas} />
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <ResumoMultasVeiculo quantidade={item.qtdMultasHistorico} quantidadeComValor={item.multasHistoricoComValor} valor={item.valorMultasHistorico} historico />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-100 px-5 py-3 dark:border-petrol-800 dark:bg-petrol-800">
                                    <p className="text-[11px] text-slate-500 dark:text-petrol-300/70">
                                        Mostrando <span className="font-semibold text-slate-700 dark:text-petrol-100">{inicioMultas + 1}–{Math.min(inicioMultas + 6, multasPorVeiculo.length)}</span> de <span className="font-semibold text-slate-700 dark:text-petrol-100">{formatarNumero(multasPorVeiculo.length)}</span> veículos
                                    </p>
                                    {totalPaginasMultas > 1 && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setPaginaMultas((pagina) => Math.max(1, pagina - 1))}
                                                disabled={paginaMultasAtual <= 1}
                                                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-petrol-700 dark:bg-petrol-900 dark:text-petrol-200 dark:hover:bg-petrol-800"
                                            >
                                                Anterior
                                            </button>
                                            <span className="min-w-12 text-center font-mono text-[10.5px] text-slate-500 dark:text-petrol-300/70">
                                                {paginaMultasAtual}/{totalPaginasMultas}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setPaginaMultas((pagina) => Math.min(totalPaginasMultas, pagina + 1))}
                                                disabled={paginaMultasAtual >= totalPaginasMultas}
                                                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-petrol-700 dark:bg-petrol-900 dark:text-petrol-200 dark:hover:bg-petrol-800"
                                            >
                                                Próxima
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="rounded-lg border border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-petrol-800 dark:text-petrol-300/70">
                                Ainda não há multas registradas por veículo.
                            </p>
                        )}

                        <p className="mt-3 text-[10.5px] leading-relaxed text-slate-500 dark:text-petrol-300/70">
                            <strong>Ativas:</strong> encontradas na última consulta confirmada do Detran.{" "}
                            <strong>Ativas + inativas:</strong> todo o histórico conhecido, incluindo multas que deixaram de aparecer; isso não confirma que foram pagas. Os valores somam apenas multas com valor nominal registrado.
                        </p>

                    </section>
                </>
            ) : (
                <div className="flex min-h-52 items-center justify-center text-sm text-slate-500 dark:text-petrol-300/70">
                    Não há dados para exibir.
                </div>
            )}
        </section>
    )
}

function GraficoBarrasContratos({
    dados,
    selecionados,
    onAlternar,
}: {
    dados: RelatoriosDetranData['valoresPorContrato']
    selecionados: string[]
    onAlternar: (id: string) => void
}) {
    const contratosOrdenados = [...dados].sort(
        (primeiro, segundo) =>
            segundo.valorMultasAtivas - primeiro.valorMultasAtivas ||
            primeiro.contrato.localeCompare(segundo.contrato)
    )
    const realceAtivo = selecionados.length > 0
    const formatarEixo = new Intl.NumberFormat('pt-BR', {
        notation: 'compact',
        maximumFractionDigits: 1,
    })
    const larguraGrafico = Math.max(760, contratosOrdenados.length * 112)

    return (
        <div className="overflow-x-auto border-y border-slate-200 py-3 dark:border-petrol-800">
            <div style={{ width: larguraGrafico, height: 370 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={contratosOrdenados}
                        margin={{ top: 28, right: 24, bottom: 54, left: 12 }}
                        barCategoryGap="28%"
                    >
                        <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 5"
                            className="stroke-slate-200 dark:stroke-petrol-800"
                        />
                        <XAxis
                            dataKey="contrato"
                            interval={0}
                            angle={-32}
                            textAnchor="end"
                            height={76}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(nome: string) => nome.length > 18 ? `${nome.slice(0, 17)}…` : nome}
                            className="fill-slate-600 dark:fill-petrol-200"
                        />
                        <YAxis
                            width={68}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(valor: number) => formatarEixo.format(valor)}
                            className="fill-slate-500 dark:fill-petrol-300/70"
                            label={{
                                value: 'Valor acumulado (R$)',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 8,
                                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 10 },
                            }}
                        />
                        <Tooltip
                            formatter={(valor) => [formatarMoeda(Number(valor)), 'Multas ativas']}
                            labelFormatter={(nome) => String(nome)}
                            cursor={{ fill: 'rgba(100, 116, 139, 0.08)' }}
                            contentStyle={{
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                fontSize: 12,
                            }}
                        />
                        <Bar
                            dataKey="valorMultasAtivas"
                            name="Valor acumulado"
                            maxBarSize={58}
                            radius={[4, 4, 0, 0]}
                            cursor="pointer"
                            onClick={(_entry, index) => {
                                const contrato = contratosOrdenados[index]
                                if (contrato) onAlternar(contrato.id)
                            }}
                        >
                            {contratosOrdenados.map((item) => {
                                const selecionado = selecionados.includes(item.id)
                                const atenuado = realceAtivo && !selecionado
                                return (
                                    <Cell
                                        key={item.id}
                                        fill={selecionado ? '#047857' : '#059669'}
                                        fillOpacity={atenuado ? 0.35 : 1}
                                    />
                                )
                            })}
                            <LabelList
                                dataKey="valorMultasAtivas"
                                position="top"
                                formatter={(valor) => formatarMoeda(Number(valor))}
                                style={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

const CORES_SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
const COR_DEMAIS = '#94a3b8'
const ID_DEMAIS = '__DEMAIS__'
const MAX_LINHAS = CORES_SERIES.length
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const rotuloMesCurto = (mes: string) => {
    const [ano, numero] = mes.split('-')
    return `${MESES_CURTOS[Number(numero) - 1]}/${ano.slice(2)}`
}
const rotuloMesLongo = (mes: string) => {
    const [ano, numero] = mes.split('-').map(Number)
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(ano, numero - 1, 1))
}

function GraficoEvolucaoMensal({
    evolucao,
    contratos,
    selecionados,
}: {
    evolucao: RelatoriosDetranData['evolucaoMensalContratos']
    contratos: RelatoriosDetranData['valoresPorContrato']
    selecionados: string[]
}) {
    const visiveis = contratos
        .filter((item) => item.valorMultasAtivas > 0)
        .filter((item) => selecionados.length === 0 || selecionados.includes(item.id))
        .sort((primeiro, segundo) => segundo.valorMultasAtivas - primeiro.valorMultasAtivas)

    // Acima de 8 contratos, os menores são somados em "Demais contratos".
    const agrupar = visiveis.length > MAX_LINHAS
    const principais = agrupar ? visiveis.slice(0, MAX_LINHAS - 1) : visiveis
    const idsDemais = agrupar ? visiveis.slice(MAX_LINHAS - 1).map((item) => item.id) : []

    const series = [
        ...principais.map((item, indice) => ({
            id: item.id,
            nome: item.contrato,
            cor: CORES_SERIES[indice],
            total: item.valorMultasAtivas,
        })),
        ...(agrupar
            ? [{
                id: ID_DEMAIS,
                nome: `Demais contratos (${idsDemais.length})`,
                cor: COR_DEMAIS,
                total: visiveis.slice(MAX_LINHAS - 1).reduce((soma, item) => soma + item.valorMultasAtivas, 0),
            }]
            : []),
    ]

    const linhas = evolucao.meses.map(({ mes, valores }) => ({
        mes,
        valores: {
            ...Object.fromEntries(principais.map((item) => [item.id, valores[item.id] ?? 0])),
            ...(agrupar ? { [ID_DEMAIS]: idsDemais.reduce((soma, id) => soma + (valores[id] ?? 0), 0) } : {}),
        } as Record<string, number>,
    }))

    const formatarEixo = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
    const larguraGrafico = Math.max(760, linhas.length * 64)
    const mostrarPontos = linhas.length <= 18

    if (series.length === 0) {
        return (
            <p className="py-4 text-xs text-slate-500 dark:text-petrol-300/70">
                Não há multas ativas para os contratos selecionados.
            </p>
        )
    }

    return (
        <div className="border-y border-slate-200 py-3 dark:border-petrol-800">
            <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-2 px-1" aria-label="Legenda">
                {series.map((serie) => (
                    <li key={serie.id} className="inline-flex items-center gap-2 text-[11px] text-slate-600 dark:text-petrol-200">
                        <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ backgroundColor: serie.cor }} />
                        <span title={serie.nome}>{serie.nome.length > 24 ? `${serie.nome.slice(0, 23)}…` : serie.nome}</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-white">{formatarMoeda(serie.total)}</span>
                    </li>
                ))}
            </ul>
            <div className="overflow-x-auto">
                <div style={{ width: larguraGrafico, height: 340 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={linhas} margin={{ top: 12, right: 24, bottom: 8, left: 12 }}>
                            <CartesianGrid
                                vertical={false}
                                strokeDasharray="3 5"
                                className="stroke-slate-200 dark:stroke-petrol-800"
                            />
                            <XAxis
                                dataKey="mes"
                                interval="preserveStartEnd"
                                tick={{ fontSize: 10 }}
                                tickFormatter={rotuloMesCurto}
                                className="fill-slate-600 dark:fill-petrol-200"
                            />
                            <YAxis
                                width={68}
                                tick={{ fontSize: 10 }}
                                tickFormatter={(valor: number) => formatarEixo.format(valor)}
                                className="fill-slate-500 dark:fill-petrol-300/70"
                                label={{
                                    value: 'Valor (R$)',
                                    angle: -90,
                                    position: 'insideLeft',
                                    offset: 8,
                                    style: { textAnchor: 'middle', fill: '#64748b', fontSize: 10 },
                                }}
                            />
                            <Tooltip
                                cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
                                wrapperStyle={{ zIndex: 20 }}
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null
                                    const itens = payload
                                        .filter((item) => Number(item.value) > 0)
                                        .sort((a, b) => Number(b.value) - Number(a.value))
                                    const total = itens.reduce((soma, item) => soma + Number(item.value), 0)

                                    return (
                                        <div className="min-w-52 rounded-md border border-slate-300 bg-white px-3 py-2 text-[11px] shadow-lg dark:border-petrol-700 dark:bg-petrol-900">
                                            <p className="mb-1.5 font-semibold capitalize text-slate-800 dark:text-white">
                                                {rotuloMesLongo(String(label))}
                                            </p>
                                            {itens.length === 0 ? (
                                                <p className="text-slate-500 dark:text-petrol-300/70">Sem multas ativas neste mês.</p>
                                            ) : (
                                                <>
                                                    {itens.map((item) => (
                                                        <p key={String(item.name)} className="flex items-center justify-between gap-4 py-0.5">
                                                            <span className="inline-flex items-center gap-2 text-slate-600 dark:text-petrol-200">
                                                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                                                                {item.name}
                                                            </span>
                                                            <span className="font-mono font-semibold text-slate-800 dark:text-white">
                                                                {formatarMoeda(Number(item.value))}
                                                            </span>
                                                        </p>
                                                    ))}
                                                    {itens.length > 1 && (
                                                        <p className="mt-1 flex justify-between gap-4 border-t border-slate-200 pt-1 font-semibold text-slate-800 dark:border-petrol-700 dark:text-white">
                                                            <span>Total</span>
                                                            <span className="font-mono">{formatarMoeda(total)}</span>
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )
                                }}
                            />
                            {series.map((serie) => (
                                <Line
                                    key={serie.id}
                                    type="linear"
                                    name={serie.nome}
                                    // Função em vez de string: nomes de contrato com "." quebrariam o dataKey do recharts.
                                    dataKey={(linha: (typeof linhas)[number]) => linha.valores[serie.id] ?? 0}
                                    stroke={serie.cor}
                                    strokeWidth={2}
                                    dot={mostrarPontos ? { r: 3, strokeWidth: 0, fill: serie.cor } : false}
                                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}

function Indicador({
    titulo,
    valor,
    detalhe,
    Icone,
    cor,
}: {
    titulo: string
    valor: string
    detalhe: string
    Icone: ComponentType<SVGProps<SVGSVGElement>>
    cor: 'petrol' | 'rose' | 'amber' | 'emerald'
}) {
    const cores = {
        petrol: 'text-petrol-700 dark:text-petrol-300',
        rose: 'text-rose-700 dark:text-rose-400',
        amber: 'text-amber-700 dark:text-amber-400',
        emerald: 'text-emerald-700 dark:text-emerald-400',
    }

    return (
        <article className="group relative overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-200/70 p-4 shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-slate-300 hover:shadow-md dark:border-petrol-800 dark:from-petrol-900 dark:to-petrol-800/70 dark:hover:border-petrol-700">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 to-slate-400/30 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 dark:from-petrol-700/10 dark:to-petrol-500/20" />
            <div className="relative">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition-colors duration-300 group-hover:text-slate-700 dark:text-petrol-300/70 dark:group-hover:text-petrol-100">
                            {titulo}
                        </h3>
                        <p className="mt-2 font-mono text-3xl font-semibold leading-none text-slate-900 dark:text-white">
                            {valor}
                        </p>
                    </div>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-transform duration-300 group-hover:scale-105 dark:bg-petrol-800 dark:ring-petrol-700 ${cores[cor]}`}>
                        <Icone className="h-5 w-5" />
                    </span>
                </div>
                <div className="mt-4 flex min-h-6 items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        cor === 'petrol' ? 'bg-petrol-500' :
                        cor === 'rose' ? 'bg-rose-500' :
                        cor === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <p className="text-[10.5px] leading-snug text-slate-500 transition-colors duration-300 group-hover:text-slate-600 dark:text-petrol-300/70 dark:group-hover:text-petrol-200">
                        {detalhe}
                    </p>
                </div>
            </div>
        </article>
    )
}

function DonutSituacao({
    titulo,
    total,
    valores,
}: {
    titulo: string
    total: number
    valores: Array<{ rotulo: string; valor: number; cor: string }>
}) {
    const dadosDonut = total > 0
        ? valores.filter((item) => item.valor > 0)
        : [{ rotulo: 'Sem dados', valor: 1, cor: '#cbd5e1' }]

    return (
        <div className="border-t border-slate-200 pt-4 dark:border-petrol-800">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-slate-700 dark:text-petrol-100">
                {titulo}
            </h4>
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                <div
                    role="img"
                    aria-label={`${titulo}: ${valores.map((item) => `${item.rotulo} ${item.valor}, ${formatarPercentual(item.valor, total)}%`).join('; ')}`}
                    className="relative h-36 w-36 shrink-0"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={dadosDonut}
                                dataKey="valor"
                                nameKey="rotulo"
                                innerRadius="62%"
                                outerRadius="94%"
                                paddingAngle={total > 0 ? 2 : 0}
                                startAngle={90}
                                endAngle={-270}
                                stroke="none"
                                isAnimationActive
                            >
                                {dadosDonut.map((item) => (
                                    <Cell key={item.rotulo} fill={item.cor} />
                                ))}
                            </Pie>
<Tooltip
  wrapperStyle={{ zIndex: 20, pointerEvents: 'none' }}
  contentStyle={{
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 11,
  }}
  labelStyle={{ fontSize: 11 }}
  itemStyle={{ fontSize: 11, padding: '2px 0' }}
  formatter={(valor, nome) => [
    `${formatarNumero(Number(valor))} (${formatarPercentual(Number(valor), total)}%)`,
    String(nome),
  ]}
/>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-[20%] z-0 flex flex-col items-center justify-center rounded-full bg-white text-center dark:bg-petrol-950">
                        <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
                            {formatarNumero(total)}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-petrol-300/70">
                            veículos
                        </span>
                    </div>
                </div>
                <ul className="w-full space-y-2.5">
                    {valores.map((item) => (
                        <li key={item.rotulo} className="flex items-center justify-between gap-3 text-[11px]">
                            <span className="inline-flex items-center gap-2 text-slate-600 dark:text-petrol-200">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.cor }} />
                                {item.rotulo}
                            </span>
                            <span className="whitespace-nowrap font-mono font-semibold text-slate-800 dark:text-white">
                                {formatarNumero(item.valor)} <span className="text-slate-400">({formatarPercentual(item.valor, total)}%)</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

function ResumoMultasVeiculo({
    quantidade,
    quantidadeComValor,
    valor,
    historico = false,
}: {
    quantidade: number
    quantidadeComValor: number
    valor: number
    historico?: boolean
}) {
    return (
        <div className="min-w-0">
            <p className="text-[10.5px] font-semibold text-slate-700 dark:text-petrol-100 sm:text-xs">
                {formatarNumero(quantidade)} {quantidade === 1 ? 'multa' : 'multas'}
            </p>
            <p className={`mt-0.5 truncate font-mono text-[11px] font-bold sm:text-xs ${historico ? 'text-slate-700 dark:text-petrol-100' : 'text-rose-700 dark:text-rose-400'}`}>
                {formatarMoeda(valor)}
            </p>
            <p className="mt-0.5 text-[9px] text-slate-400 dark:text-petrol-400/70">
                Valor em {formatarNumero(quantidadeComValor)} de {formatarNumero(quantidade)}
            </p>
        </div>
    )
}