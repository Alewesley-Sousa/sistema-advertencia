// src/renderer/App.tsx

import { useEffect, useState, useCallback } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import {
  enviarEmailInfracao,
  gerarPdfInfracao,
} from './features/infracoes/services/infracoes'
import {
  listarConfiguracoes,
  type Configuracao,
} from './features/configuracoes/services/configuracoes'
import { useSincronizarWialon } from './features/infracoes/hooks/useSincronizarWialon'
import { MainLayout } from './components/layout/MainLayout'
import { PdfModal } from './features/infracoes/components/PdfModal'
import { InfracoesPage } from './pages/InfracoesPage'
import { ConfiguracoesPage } from './pages/ConfiguracoesPage'
import { ConsultaDetranPage } from './pages/ConsultaDetranPage'
import { NotFoundPage } from './pages/NotFoundPage'

import { Toaster, showToast } from './components/ui/Toast'
import type { InfracoesAba } from './components/layout/Header'

export function App() {
  /* ---------- Estado global ---------- */
  const [configs, setConfigs] = useState<Configuracao[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  /* Aba ativa do módulo de infrações (elevada pro App pra ser lida pelo Header) */
  const [infracoesAba, setInfracoesAba] = useState<InfracoesAba>('OPERACIONAL')

  /* Contador que, quando muda, sinaliza pra página recarregar a lista */
  const [refreshKey, setRefreshKey] = useState(0)

  /* Estado de ações */
  const [gerandoPdfId, setGerandoPdfId] = useState<number | null>(null)

  const [pdfModal, setPdfModal] = useState<{ url: string | null; title: string }>({
    url: null,
    title: '',
  })

  const location = useLocation()
  const rotaAtual = location.pathname

  /* ---------- Configurações (global, carrega 1x) ---------- */

  const carregarConfiguracoes = useCallback(async () => {
    try {
      const dados: any = await listarConfiguracoes()

      const lista: Configuracao[] = Array.isArray(dados)
        ? dados
        : Array.isArray(dados?.data)
          ? dados.data
          : Array.isArray(dados?.configuracoes)
            ? dados.configuracoes
            : []

      setConfigs(lista)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      setConfigs([])
      showToast.error('Erro ao carregar configurações do sistema.')
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await carregarConfiguracoes()
      setLoading(false)
    }
    init()
  }, [carregarConfiguracoes])

  /* ---------- Refresh das páginas ---------- */

  const pedirRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  /* ---------- Sincronização Wialon (global, usada pelo Header) ---------- */

  const { sincronizar, sincronizando } = useSincronizarWialon(pedirRefresh)

  /* ---------- Ação única do Header (muda conforme a rota) ---------- */

  const lidarComAtualizacao = useCallback(() => {
    if (rotaAtual.includes('configuracoes')) {
      carregarConfiguracoes()
      return
    }

    // Em /infracoes o botão é "Sincronizar" → dispara sync com Wialon
    if (rotaAtual.startsWith('/infracoes')) {
      sincronizar()
      return
    }

    // Qualquer outra rota → só recarrega
    pedirRefresh()
  }, [rotaAtual, carregarConfiguracoes, sincronizar, pedirRefresh])

  /* ---------- Ações de PDF / Email ---------- */

  const handleAbrirPdf = async (id: number, placa: string, condutor: string) => {
    setPdfModal({
      url: `http://localhost:3333/api/infracoes/${id}/pdf`,
      title: `Ofício - Placa: ${placa} (${condutor})`,
    })
  }

  const handleGerarPdf = async (id: number) => {
    try {
      setGerandoPdfId(id)
      await gerarPdfInfracao(id)
      showToast.success(`PDF do ofício #${id} gerado com sucesso!`)
      pedirRefresh()
    } catch (error: any) {
      console.error('Erro ao gerar PDF do ofício:', error)
      showToast.error(
        error?.response?.data?.message ||
          'Ops! Ocorreu um erro ao tentar gerar o PDF do ofício.'
      )
    } finally {
      setGerandoPdfId(null)
    }
  }

  const handleEnviarEmail = async (id: number) => {
    const toastId = showToast.loading(`Enviando e-mail do ofício #${id}...`)
    try {
      await enviarEmailInfracao(id)

      showToast.dismiss(toastId)
      showToast.success(`E-mail do ofício #${id} enviado com sucesso!`)
      pedirRefresh()
    } catch (error: any) {
      console.error('Erro ao enviar e-mail:', error)

      showToast.dismiss(toastId)
      showToast.error(
        error?.response?.data?.message || `Falha ao enviar e-mail do ofício #${id}.`
      )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans relative antialiased">
      <Toaster />

      <Routes>
        <Route
          element={
            <MainLayout
              loading={loading || sincronizando}
              onRefresh={lidarComAtualizacao}
              infracoesAba={infracoesAba}
              onInfracoesAbaChange={setInfracoesAba}
            />
          }
        >
          <Route path="/" element={<Navigate to="/infracoes" replace />} />

          <Route
            path="/infracoes"
            element={
              <InfracoesPage
                abaAtiva={infracoesAba}
                onAbaChange={setInfracoesAba}
                refreshKey={refreshKey}
                gerandoPdfId={gerandoPdfId}
                onAbrirPdf={handleAbrirPdf}
                onGerarPdf={handleGerarPdf}
                onEnviarEmail={handleEnviarEmail}
                onAtualizarStatus={pedirRefresh}
              />
            }
          />

          <Route path="/detran" element={<ConsultaDetranPage />} />

          <Route
            path="/configuracoes"
            element={
              <ConfiguracoesPage
                configs={configs}
                carregarConfiguracoes={carregarConfiguracoes}
              />
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <PdfModal
        url={pdfModal.url}
        title={pdfModal.title}
        onClose={() => setPdfModal({ url: null, title: '' })}
      />
    </div>
  )
}

export default App