// src/renderer/features/detran/components/DetranFleetAnimation.tsx

import { useEffect, useRef, useState } from 'react'
import { cn } from '../../../lib/cn'

interface DetranFleetAnimationProps {
  /** 0 a 100 — posição do caminhão na estrada */
  percentual: number
  /** 'real' | 'simulacao' — muda o esquema de cor da cabine */
  variante?: 'real' | 'simulacao'
  className?: string
}

/**
 * Duração da interpolação entre dois valores de `percentual`.
 * Deve ser um pouco menor que o intervalo de atualização pra nunca
 * dar "salto" quando o próximo valor chegar.
 */
const DURACAO_ANIMACAO_MS = 900

export function DetranFleetAnimation({
  percentual,
  variante = 'real',
  className,
}: DetranFleetAnimationProps) {
  const p = Math.max(0, Math.min(100, percentual))

  const corCabine = variante === 'simulacao' ? '#d97706' : '#0891b2'
  const corCabineEscura = variante === 'simulacao' ? '#92400e' : '#0e7490'

  /* ---------- Posição-alvo do caminhão ---------- */
  const larguraCaminhao = 90
  const margem = 20
  const faixaUtil = 500 - larguraCaminhao - margem * 2
  const posXAlvo = margem + (p / 100) * faixaUtil
  const posY = 88 - 46

  /* ---------- Posição animada via requestAnimationFrame ---------- */
  const [posX, setPosX] = useState(posXAlvo)
  const posXRef = useRef(posXAlvo)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const de = posXRef.current
    const para = posXAlvo

    if (Math.abs(para - de) < 0.5) {
      posXRef.current = para
      setPosX(para)
      return
    }

    const t0 = performance.now()

    const passo = (agora: number) => {
      const t = Math.min(1, (agora - t0) / DURACAO_ANIMACAO_MS)
      const eased = 1 - Math.pow(1 - t, 3)
      const atual = de + (para - de) * eased

      posXRef.current = atual
      setPosX(atual)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(passo)
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(passo)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [posXAlvo])

  return (
    <div className={cn('relative w-full', className)}>
      <style>{`
        @keyframes fleet-smoke {
          0%   { transform: translate(0, 0) scale(0.4); opacity: 0; }
          20%  { opacity: 0.85; }
          100% { transform: translate(-30px, -35px) scale(1.8); opacity: 0; }
        }
        @keyframes fleet-wheel {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes fleet-road-dash {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: 40; }
        }
        .fleet-smoke-1 { animation: fleet-smoke 2.6s ease-out infinite; }
        .fleet-smoke-2 { animation: fleet-smoke 2.6s ease-out infinite 0.9s; }
        .fleet-smoke-3 { animation: fleet-smoke 2.6s ease-out infinite 1.8s; }
        .fleet-wheel   { animation: fleet-wheel 0.6s linear infinite; transform-origin: center; }
        .fleet-road    { animation: fleet-road-dash 0.5s linear infinite; }
      `}</style>

      <svg
        viewBox="0 0 500 100"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        className="block w-full aspect-[5/1]"
      >
        {/* ============ Fundo ============ */}
        <defs>
          <linearGradient id="fleet-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="500" height="88" fill="url(#fleet-sky)" />

        {/* ============ Nuvens ============ */}
        <g opacity="0.55">
          <ellipse cx="80" cy="22" rx="18" ry="6" fill="#e2e8f0" />
          <ellipse cx="95" cy="20" rx="12" ry="5" fill="#e2e8f0" />
          <ellipse cx="330" cy="28" rx="16" ry="5" fill="#e2e8f0" />
          <ellipse cx="348" cy="26" rx="10" ry="4" fill="#e2e8f0" />
          <ellipse cx="440" cy="18" rx="14" ry="5" fill="#e2e8f0" />
        </g>

        {/* ============ Fumaça ============ */}
        {p > 0 && p < 100 && (
          <g transform={`translate(${posX + 55}, ${posY})`}>
            <circle className="fleet-smoke-1" cx="0" cy="0" r="3" fill="#94a3b8" />
            <circle className="fleet-smoke-2" cx="0" cy="0" r="4" fill="#cbd5e1" />
            <circle className="fleet-smoke-3" cx="0" cy="0" r="5" fill="#e2e8f0" />
          </g>
        )}

        {/* ============ Caminhão ============ */}
        <g transform={`translate(${posX}, ${posY})`}>
          {/* Baú */}
          <rect x="0" y="8" width="52" height="26" rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
          <line x1="13" y1="10" x2="13" y2="32" stroke="#e2e8f0" strokeWidth="0.8" />
          <line x1="26" y1="10" x2="26" y2="32" stroke="#e2e8f0" strokeWidth="0.8" />
          <line x1="39" y1="10" x2="39" y2="32" stroke="#e2e8f0" strokeWidth="0.8" />
          <rect x="0" y="24" width="52" height="3" fill={corCabine} opacity="0.85" />

          {/* Escapamento */}
          <rect x="53" y="0" width="3" height="34" rx="1" fill="#475569" />
          <rect x="52" y="-2" width="5" height="4" rx="1" fill="#1e293b" />

          {/* Cabine */}
          <path
            d="M57 36 L57 14 Q57 11 60 11 L78 11 L86 22 L86 36 Z"
            fill={corCabine}
            stroke={corCabineEscura}
            strokeWidth="1.2"
          />
          <rect x="62" y="16" width="13" height="9" rx="1" fill="#7dd3fc" stroke="#0c4a6e" strokeWidth="0.8" />
          <path d="M78 16 L82 16 L85 22 L85 30 L78 30 Z" fill="#7dd3fc" stroke="#0c4a6e" strokeWidth="0.8" opacity="0.9" />
          <rect x="84" y="31" width="2" height="2" rx="0.5" fill="#fde047" />
          <rect x="84" y="34" width="4" height="3" rx="0.5" fill="#334155" />

          {/* Chassi */}
          <rect x="0" y="34" width="86" height="3" rx="0.5" fill="#334155" />

          {/* Rodas */}
          <g>
            <circle cx="18" cy="40" r="6" fill="#1e293b" />
            <circle cx="18" cy="40" r="3" fill="#64748b" />
            <g className="fleet-wheel" style={{ transformOrigin: '18px 40px' }}>
              <line x1="18" y1="37" x2="18" y2="43" stroke="#0f172a" strokeWidth="1.2" />
              <line x1="15" y1="40" x2="21" y2="40" stroke="#0f172a" strokeWidth="1.2" />
            </g>
          </g>
          <g>
            <circle cx="68" cy="40" r="6" fill="#1e293b" />
            <circle cx="68" cy="40" r="3" fill="#64748b" />
            <g className="fleet-wheel" style={{ transformOrigin: '68px 40px' }}>
              <line x1="68" y1="37" x2="68" y2="43" stroke="#0f172a" strokeWidth="1.2" />
              <line x1="65" y1="40" x2="71" y2="40" stroke="#0f172a" strokeWidth="1.2" />
            </g>
          </g>
          <g>
            <circle cx="80" cy="40" r="6" fill="#1e293b" />
            <circle cx="80" cy="40" r="3" fill="#64748b" />
            <g className="fleet-wheel" style={{ transformOrigin: '80px 40px' }}>
              <line x1="80" y1="37" x2="80" y2="43" stroke="#0f172a" strokeWidth="1.2" />
              <line x1="77" y1="40" x2="83" y2="40" stroke="#0f172a" strokeWidth="1.2" />
            </g>
          </g>
        </g>

        {/* ============ Pista ============ */}
        <line x1="0" y1="88" x2="500" y2="88" stroke="#cbd5e1" strokeWidth="1.5" />
        <line
          className="fleet-road"
          x1="0"
          y1="93"
          x2="500"
          y2="93"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeDasharray="20 20"
          strokeLinecap="round"
        />

        {/* ============ Bandeira ============ */}
        <g transform="translate(485, 62)">
          <line x1="0" y1="0" x2="0" y2="28" stroke="#64748b" strokeWidth="1.5" />
          <path d="M0 0 L12 3 L0 6 Z" fill={p >= 100 ? '#10b981' : '#94a3b8'} />
        </g>
      </svg>
    </div>
  )
}