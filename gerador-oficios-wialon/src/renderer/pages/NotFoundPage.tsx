import { ArrowLeft, Home } from 'lucide-react'

interface NotFoundPageProps {
  onVoltarHome?: () => void
}

export function NotFoundPage({ onVoltarHome }: NotFoundPageProps) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <style>{`
        @keyframes smoke-puff {
          0%   { transform: translate(0, 0) scale(0.3); opacity: 0; }
          20%  { opacity: 0.85; }
          100% { transform: translate(-90px, -100px) scale(2.2); opacity: 0; }
        }
        @keyframes wheel-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes road-dash {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: 60; }
        }
        @keyframes truck-bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1.5px); }
        }
        @keyframes float-title {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        .smoke { transform-box: fill-box; transform-origin: center; }
        .smoke-1 { animation: smoke-puff 3.2s ease-out infinite; }
        .smoke-2 { animation: smoke-puff 3.2s ease-out infinite 1.05s; }
        .smoke-3 { animation: smoke-puff 3.2s ease-out infinite 2.1s; }
        .wheel   { animation: wheel-spin 0.7s linear infinite; }
        .road    { animation: road-dash 0.8s linear infinite; }
        .truck   { animation: truck-bounce 1.4s ease-in-out infinite; }
        .float-title { animation: float-title 3s ease-in-out infinite; }
      `}</style>

      <h1 className="float-title text-[10rem] sm:text-[14rem] font-black leading-none bg-gradient-to-b from-slate-200 to-slate-100 bg-clip-text text-transparent select-none absolute top-6 sm:top-2">
        404
      </h1>

      <div className="relative z-10 flex flex-col items-center space-y-8 max-w-lg w-full">
        <div className="relative w-full flex items-end justify-center">
          <svg
            className="truck w-[320px] sm:w-[380px] h-auto"
            viewBox="0 0 360 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Sombra no chão */}
            <ellipse cx="180" cy="160" rx="150" ry="4" fill="#0f172a" opacity="0.12" />

            {/* Fumaça (atrás da cabine, saindo pelo escapamento) */}
            <circle className="smoke smoke-1" cx="210" cy="10" r="5" fill="#94a3b8" />
            <circle className="smoke smoke-2" cx="210" cy="10" r="6" fill="#cbd5e1" />
            <circle className="smoke smoke-3" cx="210" cy="10" r="7" fill="#e2e8f0" />

            {/* ===== BAÚ / TRAILER ===== */}
            <rect x="25" y="35" width="180" height="82" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="65" y1="40" x2="65" y2="112" stroke="#e2e8f0" strokeWidth="1" />
            <line x1="105" y1="40" x2="105" y2="112" stroke="#e2e8f0" strokeWidth="1" />
            <line x1="145" y1="40" x2="145" y2="112" stroke="#e2e8f0" strokeWidth="1" />
            <line x1="185" y1="40" x2="185" y2="112" stroke="#e2e8f0" strokeWidth="1" />
            <rect x="25" y="92" width="180" height="7" fill="#0ea5e9" opacity="0.85" />
            <rect x="27" y="50" width="3" height="8" fill="#64748b" />
            <rect x="27" y="100" width="3" height="8" fill="#64748b" />

            {/* ===== ESCAPAMENTO VERTICAL ===== */}
            <rect x="207" y="15" width="6" height="100" rx="2" fill="#475569" />
            <rect x="205" y="10" width="10" height="7" rx="2" fill="#1e293b" />

            {/* ===== CABINE ===== */}
            <path
              d="M215 120 L215 50 Q215 45 220 45 L305 45 L325 68 L325 120 Z"
              fill="#dc2626"
              stroke="#7f1d1d"
              strokeWidth="1.5"
            />
            {/* Janela lateral */}
            <rect x="225" y="55" width="60" height="32" rx="2" fill="#7dd3fc" stroke="#0c4a6e" strokeWidth="1" />
            {/* Para-brisa */}
            <path d="M293 55 L308 55 L322 70 L322 92 L293 92 Z" fill="#7dd3fc" stroke="#0c4a6e" strokeWidth="1" opacity="0.9" />
            {/* Divisória da porta */}
            <line x1="293" y1="55" x2="293" y2="115" stroke="#7f1d1d" strokeWidth="1" />
            {/* Maçaneta */}
            <rect x="275" y="98" width="14" height="3" rx="1" fill="#450a0a" />
            {/* Farol */}
            <rect x="318" y="100" width="6" height="6" rx="1" fill="#fde047" />
            {/* Para-choque */}
            <rect x="316" y="112" width="14" height="8" rx="2" fill="#334155" />
            {/* Espelho lateral */}
            <line x1="322" y1="60" x2="332" y2="70" stroke="#334155" strokeWidth="1.5" />
            <rect x="329" y="62" width="5" height="14" rx="1" fill="#334155" />

            {/* ===== CHASSI ===== */}
            <rect x="25" y="117" width="300" height="6" rx="1" fill="#334155" />

            {/* ===== RODAS ===== */}
            {/* Trailer - traseira */}
            <g>
              <circle cx="70" cy="140" r="18" fill="#1e293b" />
              <circle cx="70" cy="140" r="9" fill="#64748b" />
              <g className="wheel" style={{ transformOrigin: '70px 140px' }}>
                <circle cx="70" cy="140" r="4" fill="#334155" />
                <line x1="70" y1="131" x2="70" y2="149" stroke="#0f172a" strokeWidth="2" />
                <line x1="61" y1="140" x2="79" y2="140" stroke="#0f172a" strokeWidth="2" />
              </g>
            </g>
            {/* Trailer - dianteira */}
            <g>
              <circle cx="115" cy="140" r="18" fill="#1e293b" />
              <circle cx="115" cy="140" r="9" fill="#64748b" />
              <g className="wheel" style={{ transformOrigin: '115px 140px' }}>
                <circle cx="115" cy="140" r="4" fill="#334155" />
                <line x1="115" y1="131" x2="115" y2="149" stroke="#0f172a" strokeWidth="2" />
                <line x1="106" y1="140" x2="124" y2="140" stroke="#0f172a" strokeWidth="2" />
              </g>
            </g>
            {/* Cabine - traseira */}
            <g>
              <circle cx="240" cy="140" r="18" fill="#1e293b" />
              <circle cx="240" cy="140" r="9" fill="#64748b" />
              <g className="wheel" style={{ transformOrigin: '240px 140px' }}>
                <circle cx="240" cy="140" r="4" fill="#334155" />
                <line x1="240" y1="131" x2="240" y2="149" stroke="#0f172a" strokeWidth="2" />
                <line x1="231" y1="140" x2="249" y2="140" stroke="#0f172a" strokeWidth="2" />
              </g>
            </g>
            {/* Cabine - dianteira */}
            <g>
              <circle cx="300" cy="140" r="18" fill="#1e293b" />
              <circle cx="300" cy="140" r="9" fill="#64748b" />
              <g className="wheel" style={{ transformOrigin: '300px 140px' }}>
                <circle cx="300" cy="140" r="4" fill="#334155" />
                <line x1="300" y1="131" x2="300" y2="149" stroke="#0f172a" strokeWidth="2" />
                <line x1="291" y1="140" x2="309" y2="140" stroke="#0f172a" strokeWidth="2" />
              </g>
            </g>

            {/* ===== PISTA (dashes animados) ===== */}
            <line
              className="road"
              x1="0"
              y1="162"
              x2="360"
              y2="162"
              stroke="#cbd5e1"
              strokeWidth="3"
              strokeDasharray="30 30"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Textos */}
        <div className="space-y-3 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            O caminhão pegou o caminho errado.
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            A página que você procurava não existe, foi removida ou nunca esteve nesse endereço.
          </p>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
          {onVoltarHome ? (
            <button
              type="button"
              onClick={onVoltarHome}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm px-5 py-3 rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Voltar ao início
            </button>
          ) : (
            <a
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm px-5 py-3 rounded-xl transition shadow-sm active:scale-95"
            >
              <Home className="w-4 h-4" />
              Voltar ao início
            </a>
          )}

          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-3 rounded-xl transition border border-slate-200 shadow-sm active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Página anterior
          </button>
        </div>
      </div>
    </div>
  )
}