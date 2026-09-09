import React from 'react'
import { Metrics } from '../types'
import { BarChart3, CheckCircle2, XCircle, Database, Gauge } from 'lucide-react'

interface MetricsPanelProps {
  metrics: Metrics
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  const hitRatio =
    metrics.requests > 0
      ? Math.round((metrics.cache_hits / metrics.requests) * 100)
      : 0

  return (
    <div className="bg-surface-card rounded-lg border border-hairline p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-mono">
            3. Metrics & Counters
          </h2>
        </div>

        {/* Hit Ratio Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted">Hit Ratio:</span>
          <span
            className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-pill ${
              hitRatio >= 80
                ? 'bg-success/15 text-success'
                : hitRatio >= 50
                ? 'bg-accent-amber/15 text-accent-amber'
                : 'bg-surface-soft text-muted'
            }`}
          >
            {hitRatio}%
          </span>
        </div>
      </div>

      {/* 4 Large Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Requests */}
        <div className="bg-canvas rounded-lg border border-hairline p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-mono">
            <span>Requests</span>
            <Gauge className="w-3.5 h-3.5 text-muted-soft" />
          </div>
          <div className="text-2xl font-serif font-medium text-ink">
            {metrics.requests}
          </div>
          <div className="text-[11px] text-muted">Total HTTP requests</div>
        </div>

        {/* Cache Hits */}
        <div className="bg-canvas rounded-lg border border-hairline p-3.5 space-y-1">
          <div className="flex items-center justify-between text-success text-xs font-mono">
            <span>Cache Hits</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-serif font-medium text-success">
            {metrics.cache_hits}
          </div>
          <div className="text-[11px] text-muted">Served from Redis</div>
        </div>

        {/* Cache Misses */}
        <div className="bg-canvas rounded-lg border border-hairline p-3.5 space-y-1">
          <div className="flex items-center justify-between text-accent-amber text-xs font-mono">
            <span>Cache Misses</span>
            <XCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-serif font-medium text-accent-amber">
            {metrics.cache_misses}
          </div>
          <div className="text-[11px] text-muted">Bypassed to DB</div>
        </div>

        {/* DB Queries */}
        <div className="bg-canvas rounded-lg border border-hairline p-3.5 space-y-1">
          <div className="flex items-center justify-between text-primary text-xs font-mono">
            <span>DB Queries</span>
            <Database className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-serif font-medium text-primary">
            {metrics.db_queries}
          </div>
          <div className="text-[11px] text-muted">MySQL SELECT executed</div>
        </div>
      </div>
    </div>
  )
}
