// App.tsx
import { useEffect, useState } from 'react'
import { 
  listarInfracoes, 
  listarConfiguracoes, 
  enviarEmailInfracao, 
  type Infracao, 
  type Configuracao 
} from './services/api'
import { Header } from './components/Header'
import { PdfModal } from './components/PdfModal'
import { InfracoesPage } from './pages/InfracoesPage'
import { ConfiguracoesPage } from './pages/ConfiguracoesPage'

export function App() {
  const [abaAtiva, setAbaAtiva] = useState<'infracoes' | 'configuracoes'>('infracoes')
  const [infracoes, setInfracoes] = useState<Infracao[]>([])
  const [configs, setConfigs] = useState<Configuracao[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  
  // Estados para feedbacks das ações nas linhas da tabela
  const [enviandoEmailId, setEnviandoEmailId] = useState<number | null>(null)
  const [loadingPdfId, setLoadingPdfId] = useState<number | null>(null)

  const [pdfModal, setPdfModal] = useState<{ url: string | null; title: string }>({
    url: null,
    title: '',
  })

  const carregarInfracoes = async () => {
    try {
      setLoading(true)
      const dados = await listarInfracoes()
      setInfracoes(dados)
    } catch (error) {
      console.error('Erro ao carregar infrações:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarConfiguracoes = async () => {
    try {
      const dados = await listarConfiguracoes()
      setConfigs(dados)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  useEffect(() => {
    carregarInfracoes()
    carregarConfiguracoes()
    const interval = setInterval(carregarInfracoes, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleAbrirPdf = (id: number, placa: string, condutor: string) => {
    setPdfModal({
      url: `http://localhost:3333/api/infracoes/${id}/pdf`,
      title: `Ofício - Placa: ${placa} (${condutor})`,
    })
  }

  const handleEnviarEmail = async (id: number) => {
    try {
      setEnviandoEmailId(id)
      await enviarEmailInfracao(id)
      await carregarInfracoes()
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error)
    } finally {
      setEnviandoEmailId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans relative antialiased">
      <Header 
        abaAtiva={abaAtiva} 
        setAbaAtiva={setAbaAtiva} 
        onRefresh={abaAtiva === 'infracoes' ? carregarInfracoes : carregarConfiguracoes} 
        loading={loading} 
      />

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {abaAtiva === 'infracoes' ? (
          <InfracoesPage 
            infracoesLocais={infracoes} 
            loadingPdfId={loadingPdfId}
            enviandoEmailId={enviandoEmailId}
            onAbrirPdf={handleAbrirPdf} 
            onEnviarEmail={handleEnviarEmail}
            onAtualizarStatus={carregarInfracoes}
          />
        ) : (
          <ConfiguracoesPage configs={configs} carregarConfiguracoes={carregarConfiguracoes} />
        )}
      </main>

      <PdfModal 
        url={pdfModal.url} 
        title={pdfModal.title} 
        onClose={() => setPdfModal({ url: null, title: '' })} 
      />
    </div>
  )
}

export default App