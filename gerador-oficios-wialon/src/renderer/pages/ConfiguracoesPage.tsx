// src/renderer/pages/ConfiguracoesPage.tsx

import { useState, type FormEvent } from 'react'
import { Plus, Trash2, Mail } from 'lucide-react'

import type { Configuracao } from '../services/configuracoes'

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

  const { emails, salvando, adicionar, remover } = useEmailsNotificacao({
    configs,
    recarregarConfigs: carregarConfiguracoes,
  })

  const handleAdicionarEmail = (e: FormEvent) => {
    e.preventDefault()
    const ok = adicionar(novoEmail)
    if (ok) setNovoEmail('')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-blue-950">Destinatários de Notificação</CardTitle>
              <CardDescription>
                Os e-mails cadastrados aqui receberão os ofícios de infração gerados automaticamente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleAdicionarEmail} className="flex gap-3 mb-6">
          <input
            type="email"
            placeholder="Digite o e-mail do destinatário (ex: gestao@empresa.com)"
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            disabled={salvando}
            className={cn(
              'flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm text-slate-800',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!novoEmail.trim()}
            loading={salvando}
          >
            {!salvando && <Plus className="w-4 h-4" />}
            Adicionar
          </Button>
        </form>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            E-mails Ativos ({emails.length})
          </label>

          {emails.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
              <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">
                Nenhum e-mail cadastrado.
              </p>
              <p className="text-xs text-slate-400">
                Adicione um e-mail acima para começar a receber alertas.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              {emails.map((email) => (
                <div
                  key={email}
                  className="px-4 py-3 flex items-center justify-between hover:bg-white transition group"
                >
                  <span className="text-sm font-medium text-slate-700">{email}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remover(email)}
                    disabled={salvando}
                    title="Remover e-mail"
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}