import React from 'react'
import { RotateCcw, Sparkles } from 'lucide-react'

interface HeaderProps {
  onReset: () => void
  onSeed: () => void
  isResetting: boolean
  isSeeding: boolean
  sseConnected: boolean
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  onSeed,
  isResetting,
  isSeeding,
  sseConnected,
}) => {
  return (
    <header className="border-b border-hairline bg-canvas/90 backdrop-blur-sm sticky top-0 z-30 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          {/* Anthropic-style 4-radial spike mark */}
          <div className="w-8 h-8 rounded-lg bg-surface-dark flex items-center justify-center text-primary shadow-sm">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
              <path d="M12 2L13.8 9.2L21 11L13.8 12.8L12 20L10.2 12.8L3 11L10.2 9.2L12 2Z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-normal text-ink tracking-tight">
                Redis Practice Dashboard
              </h1>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-pill bg-surface-card text-muted border border-hairline">
                v1.0
              </span>
            </div>
            <p className="text-xs text-muted">
              Observability & Behavioral Visualization for Cache Aside, Invalidation, TTL & Stampede
            </p>
          </div>
        </div>

        {/* Status Indicators & Global Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* SSE Live Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-card border border-hairline text-xs font-mono text-muted">
            <span
              className={`w-2 h-2 rounded-full ${
                sseConnected ? 'bg-success animate-pulse' : 'bg-muted-soft'
              }`}
            />
            <span>{sseConnected ? 'SSE Live' : 'Polling'}</span>
          </div>

          {/* Seed Product #1 */}
          <button
            type="button"
            onClick={onSeed}
            disabled={isSeeding}
            title="Create Product #1 (Mechanical Keyboard) in DB"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-ink bg-surface-card hover:bg-surface-cream-strong active:scale-95 transition-all rounded-md border border-hairline disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-amber" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Product #1'}</span>
          </button>

          {/* Reset Environment */}
          <button
            type="button"
            onClick={onReset}
            disabled={isResetting}
            title="Reset metrics, configurations, and state"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary-active active:scale-95 transition-all rounded-md shadow-sm disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Resetting...' : 'Reset Environment'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
