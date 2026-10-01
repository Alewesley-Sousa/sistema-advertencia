// src/renderer/features/infracoes/components/InfracaoMapa.tsx

import { MapPin } from 'lucide-react'
import type { Infracao } from '../services/infracoes'

interface InfracaoMapaProps {
  infracoes: Infracao[]
  selecionada?: Infracao | null
}

const COR_STATUS: Record<string, string> = {
  PENDENTE: '#f59e0b',
  REGISTRADO: '#f59e0b',
  PROCESSANDO: '#3b82f6',
  GERADO: '#94a3b8',
  ENVIADO: '#10b981',
  ERRO: '#f43f5e',
}

function posicaoFake(item: Infracao): { x: number; y: number } {
  const h = (item.id * 9301 + 49297) % 233280
  const x = 120 + ((h % 700) / 700) * 680
  const y = 100 + (((h * 7) % 500) / 500) * 480
  return { x, y }
}

/* ── Tokens adaptativos do mapa ─────────────────────────────────── */
const MAPA_TOKENS = `
.mapa-scope {
  --mapa-bg:         #e8ebef;
  --mapa-grid:       #dfe3e8;
  --mapa-rio:        #d5dfe8;
  --mapa-quarteirao: #eef1f4;
  --mapa-quarteirao-borda: #dfe3e8;
  --mapa-via:        #ffffff;
  --mapa-via-linha:  #dfe3e8;

  --mapa-pin-primario: #0891b2;
  --mapa-pin-primario-soft: rgba(8, 145, 178, 0.10);
  --mapa-pin-primario-soft-2: rgba(8, 145, 178, 0.06);
  --mapa-pin-primario-ring: rgba(8, 145, 178, 0.4);
}

.dark .mapa-scope {
  --mapa-bg:         #041821;
  --mapa-grid:       #0B3542;
  --mapa-rio:        #082732;
  --mapa-quarteirao: #0B3542;
  --mapa-quarteirao-borda: #0D4150;
  --mapa-via:        #0D4150;
  --mapa-via-linha:  #1e4d5c;

  --mapa-pin-primario: #5A98A5;
  --mapa-pin-primario-soft: rgba(90, 152, 165, 0.18);
  --mapa-pin-primario-soft-2: rgba(90, 152, 165, 0.10);
  --mapa-pin-primario-ring: rgba(90, 152, 165, 0.5);
}
`

export function InfracaoMapa({ infracoes, selecionada }: InfracaoMapaProps) {
  const contexto = infracoes.filter((i) => i.id !== selecionada?.id).slice(0, 8)
  const posSel = selecionada ? posicaoFake(selecionada) : null

  return (
    <section className="mapa-scope flex-1 min-w-0 relative transition-colors" style={{ background: 'var(--mapa-bg)' }}>
      <style>{MAPA_TOKENS}</style>

      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="map-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--mapa-grid)" strokeWidth="0.8" />
          </pattern>
        </defs>

        <rect width="1000" height="700" fill="var(--mapa-bg)" />
        <rect width="1000" height="700" fill="url(#map-grid)" />

        {/* Rio */}
        <path
          d="M 0 520 Q 200 480 340 520 T 640 540 L 640 700 L 0 700 Z"
          fill="var(--mapa-rio)"
          opacity="0.55"
        />

        {/* Quarteirões */}
        <g fill="var(--mapa-quarteirao)" stroke="var(--mapa-quarteirao-borda)" strokeWidth="0.8">
          <rect x="80" y="70" width="100" height="80" rx="1" />
          <rect x="200" y="80" width="90" height="70" rx="1" />
          <rect x="310" y="65" width="105" height="90" rx="1" />
          <rect x="100" y="180" width="90" height="70" rx="1" />
          <rect x="210" y="190" width="100" height="70" rx="1" />
          <rect x="330" y="185" width="85" height="70" rx="1" />
          <rect x="90" y="280" width="105" height="85" rx="1" />
          <rect x="215" y="290" width="90" height="70" rx="1" />
          <rect x="325" y="285" width="100" height="80" rx="1" />
          <rect x="600" y="130" width="105" height="80" rx="1" />
          <rect x="725" y="120" width="95" height="70" rx="1" />
          <rect x="620" y="240" width="85" height="75" rx="1" />
          <rect x="735" y="230" width="110" height="85" rx="1" />
          <rect x="600" y="350" width="100" height="80" rx="1" />
          <rect x="720" y="340" width="100" height="75" rx="1" />
          <rect x="840" y="350" width="105" height="90" rx="1" />
        </g>

        {/* Avenida principal */}
        <line x1="-20" y1="450" x2="1020" y2="340" stroke="var(--mapa-via)" strokeWidth="30" strokeLinecap="round" />
        <line
          x1="-20" y1="450" x2="1020" y2="340"
          stroke="var(--mapa-via-linha)"
          strokeWidth="1"
          strokeDasharray="14 14"
        />

        {/* Vias secundárias */}
        <line x1="0" y1="280" x2="1000" y2="280" stroke="var(--mapa-via)" strokeWidth="12" />
        <line x1="540" y1="0" x2="540" y2="700" stroke="var(--mapa-via)" strokeWidth="12" />
        <line x1="0" y1="600" x2="1000" y2="600" stroke="var(--mapa-via)" strokeWidth="10" />

        {/* Marcadores de contexto */}
        {contexto.map((item) => {
          const { x, y } = posicaoFake(item)
          const cor = COR_STATUS[item.status] ?? '#94a3b8'
          return (
            <g key={item.id} transform={`translate(${x}, ${y})`}>
              <circle r="5" fill="var(--mapa-bg)" stroke={cor} strokeWidth="1.8" />
            </g>
          )
        })}

        {/* Marcador selecionado */}
        {posSel && selecionada && (
          <g transform={`translate(${posSel.x}, ${posSel.y})`}>
            <circle r="52" fill="var(--mapa-pin-primario)" opacity="0.06" />
            <circle r="32" fill="var(--mapa-pin-primario)" opacity="0.10" />
            <circle
              r="18"
              fill="none"
              stroke="var(--mapa-pin-primario)"
              strokeWidth="1.2"
              opacity="0.4"
              className="soft-ping"
            />
            <circle r="10" fill="var(--mapa-pin-primario)" stroke="var(--mapa-bg)" strokeWidth="2.5" />
            <circle r="3.5" fill="white" />
          </g>
        )}
      </svg>

      {/* Overlays */}

      {selecionada && (
        <div className="
          absolute top-4 left-4 flex items-center gap-2 px-2.5 py-1.5 rounded-md shadow-sm transition-colors
          bg-white/95 dark:bg-petrol-900/95 backdrop-blur
          border border-slate-200 dark:border-petrol-800
        ">
          <MapPin className="w-3 h-3 text-petrol-600 dark:text-petrol-300 transition-colors" />
          <div className="leading-none">
            <div className="text-[10px] font-semibold text-slate-800 dark:text-petrol-100 truncate max-w-[200px] transition-colors">
              {selecionada.endereco || 'Local não informado'}
            </div>
            <div className="text-[9px] text-slate-500 dark:text-petrol-300/60 mono mt-0.5 transition-colors">
              {posSel && `${posSel.x.toFixed(2)}, ${posSel.y.toFixed(2)}`}
            </div>
          </div>
        </div>
      )}

      <div className="
        absolute top-4 right-4 px-3 py-1.5 rounded-md shadow-sm transition-colors
        bg-white/95 dark:bg-petrol-900/95 backdrop-blur
        border border-slate-200 dark:border-petrol-800
      ">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-petrol-500 dark:bg-petrol-400 transition-colors" />
          <span className="text-[11px] font-bold text-slate-800 dark:text-petrol-100 mono transition-colors">
            {infracoes.length}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-petrol-300/70 transition-colors">
            {infracoes.length === 1 ? 'ocorrência' : 'ocorrências'}
          </span>
        </div>
      </div>

      {!selecionada && (
        <div className="
          absolute bottom-5 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-md shadow-sm transition-colors
          bg-white/95 dark:bg-petrol-900/95 backdrop-blur
          border border-slate-200 dark:border-petrol-800
        ">
          <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-petrol-200/80 transition-colors">
            <svg className="w-3 h-3 text-petrol-600 dark:text-petrol-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"
              />
            </svg>
            <span>Selecione uma ocorrência para tratar</span>
          </div>
        </div>
      )}

      <div className="
        absolute bottom-5 left-5 flex items-center gap-3 px-3 py-1.5 rounded-md shadow-sm text-[10px] transition-colors
        bg-white/95 dark:bg-petrol-900/95 backdrop-blur
        border border-slate-200 dark:border-petrol-800
      ">
        <Legenda cor="#f59e0b" label="Pendente" />
        <Legenda cor="#3b82f6" label="Processando" />
        <Legenda cor="#10b981" label="Enviado" />
        <Legenda cor="#f43f5e" label="Erro" />
      </div>
    </section>
  )
}

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cor }} />
      <span className="text-slate-600 dark:text-petrol-200/80 transition-colors">{label}</span>
    </div>
  )
}