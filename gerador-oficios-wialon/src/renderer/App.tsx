import { useEffect, useState } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import {
  listarInfracoesOperacional,
  enviarEmailInfracao,
  gerarPdfInfracao,
  type Infracao,
} from './services/infracoes'
import {
  listarConfiguracoes,
  type Configuracao,
} from './services/configuracoes'
import { MainLayout } from './components/layout/MainLayout'
import { PdfModal } from './features/infracoes/components/PdfModal'
import { InfracoesPage } from './pages/InfracoesPage'
import { ConfiguracoesPage } from './pages/ConfiguracoesPage'
import { ConsultaDetranPage } from './pages/ConsultaDetranPage'
import { NotFoundPage } from './pages/NotFoundPage'

import { Toaster, showToast } from './components/ui/Toast'

export function App() {
  const [infracoes, setInfracoes] = useState<Infracao[]>([])
  const [configs, setConfigs] = useState<Configuracao[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const [enviandoEmailId, setEnviandoEmailId] = useState<number | null>(null)
  const [loadingPdfId, setLoadingPdfId] = useState<number | null>(null)
  const [gerandoPdfId, setGerandoPdfId] = useState<number | null>(null)

  const [pdfModal, setPdfModal] = useState<{ url: string | null; title: string }>({
    url: null,
    title: '',
  })

  const location = useLocation()
  const rotaAtual = location.pathname

  const carregarInfracoes = async () => {
    try {
      setLoading(true)
      const dados: any = await listarInfracoesOperacional()

      // Aceita tanto array puro quanto { data: [...] }
      const lista: Infracao[] = Array.isArray(dados)
        ? dados
        : Array.isArray(dados?.data)
          ? dados.data
          : []

      setInfracoes(lista)
    } catch (error) {
      console.error('Erro ao carregar infrações:', error)
      setInfracoes([])
      showToast.error('Erro ao carregar lista de infrações.')
    } finally {
      setLoading(false)
    }
  }

  const carregarConfiguracoes = async () => {
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
  }

  useEffect(() => {
    carregarInfracoes()
    carregarConfiguracoes()
    const interval = setInterval(carregarInfracoes, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleAbrirPdf = async (id: number, placa: string, condutor: string) => {
    try {
      setLoadingPdfId(id)
      setPdfModal({
        url: `http://localhost:3333/api/infracoes/${id}/pdf`,
        title: `Ofício - Placa: ${placa} (${condutor})`,
      })
    } finally {
      setLoadingPdfId(null)
    }
  }

  const handleGerarPdf = async (id: number) => {
    try {
      setGerandoPdfId(id)
      await gerarPdfInfracao(id)
      showToast.success(`PDF do ofício #${id} gerado com sucesso!`)
      await carregarInfracoes()
    } catch (error: any) {
      console.error('Erro ao gerar PDF do ofício:', error)
      showToast.error(
        error?.response?.data?.message || 'Ops! Ocorreu um erro ao tentar gerar o PDF do ofício.'
      )
    } finally {
      setGerandoPdfId(null)
    }
  }

  const handleEnviarEmail = async (id: number) => {
    const toastId = showToast.loading(`Enviando e-mail do ofício #${id}...`)
    try {
      setEnviandoEmailId(id)
      await enviarEmailInfracao(id)

      showToast.dismiss(toastId)
      showToast.success(`E-mail do ofício #${id} enviado com sucesso!`)

      await carregarInfracoes()
    } catch (error: any) {
      console.error('Erro ao enviar e-mail:', error)

      showToast.dismiss(toastId)
      showToast.error(
        error?.response?.data?.message || `Falha ao enviar e-mail do ofício #${id}.`
      )
    } finally {
      setEnviandoEmailId(null)
    }
  }

  const lidarComAtualizacao = () => {
    if (rotaAtual.includes('configuracoes')) {
      carregarConfiguracoes()
    } else {
      carregarInfracoes()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans relative antialiased">
      <Toaster />

      <Routes>
        {/* Rota Pai: MainLayout engloba o Header e as páginas filhas via Outlet */}
        <Route element={<MainLayout loading={loading} onRefresh={lidarComAtualizacao} />}>
          {/* Redireciona a raiz para /infracoes (rota principal) */}
          <Route path="/" element={<Navigate to="/infracoes" replace />} />

          <Route
            path="/infracoes"
            element={
              <InfracoesPage
                infracoesLocais={infracoes}
                loadingPdfId={loadingPdfId}
                gerandoPdfId={gerandoPdfId}
                enviandoEmailId={enviandoEmailId}
                onAbrirPdf={handleAbrirPdf}
                onGerarPdf={handleGerarPdf}
                onEnviarEmail={handleEnviarEmail}
                onAtualizarStatus={carregarInfracoes}
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