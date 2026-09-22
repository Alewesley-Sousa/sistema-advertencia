import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // Importe aqui
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter> {/* Obrigatório para o NavLink funcionar */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
)