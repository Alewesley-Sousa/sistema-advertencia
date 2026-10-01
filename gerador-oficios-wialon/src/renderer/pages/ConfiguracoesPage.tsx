// src/renderer/pages/ConfiguracoesPage.tsx

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Plus, Trash2, Mail, Pencil, Check, X } from 'lucide-react'

import type { Configuracao } from '../features/configuracoes/services/configuracoes'

import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { cn } from '../lib/cn'

import { useEmailsNotificacao } from '../features/configuracoes/hooks/useEmailsNotificacao'

interface ConfiguracoesPageProps {
  configs: Configuracao[]
  carregarConfiguracoes: () => Promise<void>
}

export function ConfiguracoesPage({
  configs,
  carregarConfiguracoes,
}: ConfiguracoesPageProps) {
  const [novoEmail, setNovoEmail] = useState('')

  /* ─── Estado da edição inline ─────────────────────────────────── */
  const [emailEmEdicao, setEmailEmEdicao] = useState<string | null>(null)
  const [valorEdicao, setValorEdicao] = useState('')
  const inputEdicaoRef = useRef<HTMLInputElement>(null)

  const { emails, salvando, adicionar, editar, remover } =
    useEmailsNotificacao({
      configs,
      recarregarConfigs: carregarConfiguracoes,
    })

  useEffect(() => {
    if (emailEmEdicao && inputEdicaoRef.current) {
      inputEdicaoRef.current.focus()
      inputEdicaoRef.current.select()
    }
  }, [emailEmEdicao])

  useEffect(() => {
    if (emailEmEdicao && !emails.includes(emailEmEdicao)) {
      setEmailEmEdicao(null)
      setValorEdicao('')
    }
  }, [emails, emailEmEdicao])

  const handleAdicionarEmail = (e: FormEvent) => {
    e.preventDefault()
    const ok = adicionar(novoEmail)
    if (ok) setNovoEmail('')
  }

  const iniciarEdicao = (email: string) => {
    if (salvando) return
    setEmailEmEdicao(email)
    setValorEdicao(email)
  }

  const cancelarEdicao = () => {
    setEmailEmEdicao(null)
    setValorEdicao('')
  }

  const confirmarEdicao = () => {
    if (!emailEmEdicao) return
    const ok = editar(emailEmEdicao, valorEdicao)
    if (ok) cancelarEdicao()
  }

  const handleKeyDownEdicao = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmarEdicao()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelarEdicao()
    }
  }

  return (
    // Camada 0 — fundo da página (neutro no claro, petrol-950 no escuro)
    <div className="min-h-screen bg-slate-50 dark:bg-petrol-950">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* ═══ CABEÇALHO DA PÁGINA ══════════════════════════════════════ */}
        <header className="flex items-start gap-4">
          <span
            className="w-1.5 h-12 rounded-full shrink-0 mt-0.5 bg-petrol-600 dark:bg-petrol-400"
            aria-hidden
          />
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Configurações
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              Gerencie as preferências e parâmetros de funcionamento do sistema.
            </p>
          </div>
        </header>

        {/* ═══ CARD PRINCIPAL ═══════════════════════════════════════════ */}
        {/* Camada 1 — card (branco no claro, petrol-900 no escuro) */}
        <Card
          className={cn(
            'rounded-xl overflow-hidden border shadow-card',
            'bg-white border-slate-200',
            'dark:bg-petrol-900 dark:border-petrol-800',
          )}
        >
          {/* Cabeçalho = superfície operacional (petrol-100 / petrol-800) */}
          <CardHeader
            className={cn(
              'p-6 border-b',
              'bg-petrol-100 border-petrol-600/15',
              'dark:bg-petrol-800/60 dark:border-petrol-400/20',
            )}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm bg-petrol-600 dark:bg-petrol-500">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Notificações por e-mail
                </CardTitle>
                <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Configure os destinatários que receberão automaticamente os
                  ofícios de infração.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          {/* ─── Área de cadastro ──────────────────────────────────── */}
          <form
            onSubmit={handleAdicionarEmail}
            className="p-6 border-b border-slate-100 dark:border-petrol-800"
          >
            <label
              htmlFor="input-email-destinatario"
              className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2"
            >
              E-mail do destinatário
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="input-email-destinatario"
                type="email"
                placeholder="nome@empresa.com"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                disabled={salvando}
                className={cn(
                  'flex-1 h-11 rounded-lg px-4 text-sm shadow-sm transition-all',
                  'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400',
                  'dark:bg-petrol-950 dark:border-petrol-700 dark:text-slate-100 dark:placeholder:text-slate-500',
                  'focus:outline-none focus:border-petrol-600 focus:ring-2 focus:ring-petrol-600/20',
                  'dark:focus:border-petrol-400 dark:focus:ring-petrol-400/25',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!novoEmail.trim() || salvando}
                loading={salvando}
                className={cn(
                  'sm:w-auto w-full h-11 font-medium text-white shadow-sm transition-colors',
                  'bg-petrol-600 hover:bg-petrol-700',
                  'dark:bg-petrol-500 dark:hover:bg-petrol-400',
                )}
              >
                {!salvando && <Plus className="w-4 h-4 mr-1" />}
                Adicionar
              </Button>
            </div>
          </form>

          {/* ─── Lista de destinatários ─────────────────────────────── */}
          {/* Camada de fundo da lista: neutro rebaixado / petrol-950 */}
          <div className="p-6 bg-slate-50 dark:bg-petrol-950/50">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Destinatários
              </span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-petrol-800 dark:text-slate-300">
                {emails.length === 0
                  ? 'Nenhum configurado'
                  : emails.length === 1
                    ? '1 configurado'
                    : `${emails.length} configurados`}
              </span>
            </div>

            {emails.length === 0 ? (
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl py-10 px-4 text-center',
                  'bg-white border-slate-200',
                  'dark:bg-petrol-900 dark:border-petrol-700',
                )}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-slate-50 dark:bg-petrol-800">
                  <Mail className="w-6 h-6 text-slate-400 dark:text-petrol-300" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Nenhum destinatário configurado
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Adicione um endereço acima para receber automaticamente os ofícios de infração.
                </p>
              </div>
            ) : (
              <ul
                className={cn(
                  'border rounded-xl shadow-sm overflow-hidden divide-y',
                  'bg-white border-slate-200 divide-slate-100',
                  'dark:bg-petrol-900 dark:border-petrol-800 dark:divide-petrol-800',
                )}
              >
                {emails.map((email) => {
                  const emEdicao = emailEmEdicao === email

                  return (
                    <li
                      key={email}
                      className={cn(
                        'px-5 py-3.5 flex items-center gap-3 transition-colors',
                        emEdicao
                          ? 'row-selected'
                          : 'hover:bg-petrol-50/70 dark:hover:bg-petrol-800/40',
                      )}
                    >
                      {/* Status "ativo" — semântica quitado/emerald */}
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm"
                        aria-hidden
                      />

                      {emEdicao ? (
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <input
                            ref={inputEdicaoRef}
                            type="email"
                            value={valorEdicao}
                            onChange={(e) => setValorEdicao(e.target.value)}
                            onKeyDown={handleKeyDownEdicao}
                            disabled={salvando}
                            aria-label={`Editar ${email}`}
                            className={cn(
                              'flex-1 h-9 rounded-md px-3 text-sm shadow-sm transition-all',
                              'bg-white border border-petrol-600 text-slate-900',
                              'dark:bg-petrol-950 dark:border-petrol-400 dark:text-slate-100',
                              'focus:outline-none focus:ring-2 focus:ring-petrol-600/20 dark:focus:ring-petrol-400/25',
                              'disabled:opacity-50 disabled:cursor-not-allowed',
                            )}
                          />
                          <button
                            type="button"
                            onClick={confirmarEdicao}
                            disabled={salvando}
                            aria-label="Salvar alteração"
                            title="Salvar alteração"
                            className={cn(
                              'w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50',
                              'text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
                              'dark:text-emerald-300 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25',
                            )}
                          >
                            <Check className="w-4 h-4" strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={cancelarEdicao}
                            disabled={salvando}
                            aria-label="Cancelar edição"
                            title="Cancelar edição"
                            className={cn(
                              'w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50',
                              'text-slate-500 bg-slate-100 hover:bg-slate-200',
                              'dark:text-slate-300 dark:bg-petrol-800 dark:hover:bg-petrol-700',
                            )}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                              {email}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Destinatário de notificações
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => iniciarEdicao(email)}
                            disabled={salvando || !!emailEmEdicao}
                            title="Editar destinatário"
                            aria-label={`Editar ${email}`}
                            className={cn(
                              'w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                              'disabled:opacity-40 disabled:cursor-not-allowed',
                              'text-slate-400 hover:text-petrol-600 hover:bg-petrol-600/10',
                              'dark:text-slate-500 dark:hover:text-petrol-300 dark:hover:bg-petrol-400/15',
                            )}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remover(email)}
                            disabled={salvando || !!emailEmEdicao}
                            title="Remover destinatário"
                            aria-label={`Remover ${email}`}
                            className={cn(
                              'w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                              'disabled:opacity-40 disabled:cursor-not-allowed',
                              'text-slate-400 hover:text-rose-600 hover:bg-rose-50',
                              'dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/15',
                            )}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}