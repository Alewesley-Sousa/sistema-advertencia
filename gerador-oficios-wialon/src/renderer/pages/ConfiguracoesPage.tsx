import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Mail, CheckCircle2 } from 'lucide-react'
import { 
  type Configuracao, 
  atualizarConfiguracao, 
  criarConfiguracao 
} from '../services/api'

interface ConfiguracoesPageProps {
  configs: Configuracao[]
  carregarConfiguracoes: () => Promise<void>
}

export function ConfiguracoesPage({ configs, carregarConfiguracoes }: ConfiguracoesPageProps) {
  const [emails, setEmails] = useState<string[]>([])
  const [novoEmail, setNovoEmail] = useState<string>('')
  const [salvando, setSalvando] = useState<boolean>(false)
  const [mensagemSucesso, setMensagemSucesso] = useState<boolean>(false)

  // Carrega os e-mails salvos na chave 'email_notificacao' ao montar
  useEffect(() => {
    const configEmail = configs.find((c) => c.chave === 'email_notificacao')
    if (configEmail?.valor) {
      const lista = configEmail.valor
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
      setEmails(lista)
    } else {
      setEmails([])
    }
  }, [configs])

  // Salva a lista de e-mails no banco convertida para string separada por vírgulas
  const salvarListaEmails = async (novaLista: string[]) => {
    setSalvando(true)
    const valorFinal = novaLista.join(', ')

    try {
      const chaveExiste = configs.some((c) => c.chave === 'email_notificacao')
      if (chaveExiste) {
        await atualizarConfiguracao('email_notificacao', valorFinal)
      } else {
        await criarConfiguracao('email_notificacao', valorFinal)
      }

      await carregarConfiguracoes()
      setMensagemSucesso(true)
      setTimeout(() => setMensagemSucesso(false), 3000)
    } catch (error) {
      console.error('Erro ao salvar lista de e-mails:', error)
      alert('Falha ao salvar as alterações.')
    } finally {
      setSalvando(false)
    }
  }

  const handleAdicionarEmail = (e: React.FormEvent) => {
    e.preventDefault()
    const emailLimpo = novoEmail.trim().toLowerCase()

    if (!emailLimpo) return
    if (!emailLimpo.includes('@') || !emailLimpo.includes('.')) {
      return alert('Por favor, informe um e-mail válido.')
    }
    if (emails.includes(emailLimpo)) {
      return alert('Este e-mail já está cadastrado.')
    }

    const novaLista = [...emails, emailLimpo]
    setEmails(novaLista)
    setNovoEmail('')
    salvarListaEmails(novaLista)
  }

  const handleRemoverEmail = (emailParaRemover: string) => {
    const novaLista = emails.filter((e) => e !== emailParaRemover)
    setEmails(novaLista)
    salvarListaEmails(novaLista)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-blue-950">Destinatários de Notificação</h3>
              <p className="text-xs text-slate-500">
                Os e-mails cadastrados aqui receberão os ofícios de infração gerados automaticamente.
              </p>
            </div>
          </div>

          {mensagemSucesso && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> Salvo!
            </span>
          )}
        </div>

        {/* Formulário para adicionar e-mail */}
        <form onSubmit={handleAdicionarEmail} className="flex gap-3 mb-6">
          <input
            type="email"
            placeholder="Digite o e-mail do destinatário (ex: gestao@empresa.com)"
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            disabled={salvando}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={salvando || !novoEmail.trim()}
            className="bg-cyan-500 hover:bg-cyan-400 text-blue-950 font-bold text-xs rounded-xl px-5 py-2.5 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </form>

        {/* Lista de e-mails cadastrados */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            E-mails Ativos ({emails.length})
          </label>

          {emails.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
              <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">Nenhum e-mail cadastrado.</p>
              <p className="text-xs text-slate-400">Adicione um e-mail acima para começar a receber alertas.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              {emails.map((email) => (
                <div
                  key={email}
                  className="px-4 py-3 flex items-center justify-between hover:bg-white transition"
                >
                  <span className="text-sm font-medium text-slate-700">{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoverEmail(email)}
                    disabled={salvando}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                    title="Remover e-mail"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}