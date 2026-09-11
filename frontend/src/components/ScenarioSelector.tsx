import React from 'react'
import { ScenarioId, ScenarioMode, BackendConfig } from '../types'
import { Layers, RefreshCw, Clock, ShieldAlert, Zap, Gauge } from 'lucide-react'

interface ScenarioSelectorProps {
  currentScenario: ScenarioId
  currentMode: ScenarioMode
  config: BackendConfig
  onSelectScenario: (scenario: ScenarioId, mode: ScenarioMode) => void
  onSelectMode: (mode: ScenarioMode) => void
  disabled?: boolean
}

const SCENARIOS: {
  id: ScenarioId
  title: string
  subtitle: string
  icon: React.ElementType
  hasBeforeAfter: boolean
}[] = [
  {
    id: 'cache-aside',
    title: 'Cache Aside',
    subtitle: 'Cache read-through & write basics',
    icon: Layers,
    hasBeforeAfter: false,
  },
  {
    id: 'stale-cache',
    title: 'Stale Cache',
    subtitle: 'Cache Invalidation on Update',
    icon: RefreshCw,
    hasBeforeAfter: true,
  },
  {
    id: 'ttl',
    title: 'TTL Expiration',
    subtitle: 'Time To Live (30s vs No Expiration)',
    icon: Clock,
    hasBeforeAfter: true,
  },
  {
    id: 'negative-caching',
    title: 'Negative Caching',
    subtitle: 'Protect DB against missing keys',
    icon: ShieldAlert,
    hasBeforeAfter: true,
  },
  {
    id: 'cache-stampede',
    title: 'Cache Stampede',
    subtitle: 'SingleFlight concurrency protection',
    icon: Zap,
    hasBeforeAfter: true,
  },
  {
    id: 'rate-limit',
    title: 'Rate Limiting',
    subtitle: 'Sliding Window (Real-IP)',
    icon: Gauge,
    hasBeforeAfter: false,
  },
]

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  currentScenario,
  currentMode,
  config,
  onSelectScenario,
  onSelectMode,
  disabled,
}) => {
  const activeDef = SCENARIOS.find((s) => s.id === currentScenario)

  return (
    <div className="bg-surface-card rounded-lg border border-hairline p-5 shadow-sm space-y-4">
      {/* Header & Scenario Selection Tabs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted font-mono">
            1. Select Redis Scenario
          </span>
          {activeDef?.hasBeforeAfter && (
            <div className="flex items-center gap-1 bg-canvas p-1 rounded-md border border-hairline">
              <button
                type="button"
                onClick={() => onSelectMode('before')}
                disabled={disabled}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  currentMode === 'before'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Before (The Problem)
              </button>
              <button
                type="button"
                onClick={() => onSelectMode('after')}
                disabled={disabled}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  currentMode === 'after'
                    ? 'bg-success text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                After (The Solution)
              </button>
            </div>
          )}
        </div>

        {/* 6 Scenario Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SCENARIOS.map((scenario) => {
            const isSelected = scenario.id === currentScenario
            const Icon = scenario.icon
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onSelectScenario(scenario.id, currentMode)}
                disabled={disabled}
                className={`flex flex-col text-left p-3 rounded-lg border transition-all text-xs ${
                  isSelected
                    ? 'bg-canvas border-primary shadow-sm ring-1 ring-primary/20'
                    : 'bg-surface-soft/60 border-hairline/70 hover:bg-canvas hover:border-hairline text-muted'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Icon
                    className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-soft'}`}
                  />
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
                <span
                  className={`font-medium ${
                    isSelected ? 'text-ink font-semibold' : 'text-body'
                  }`}
                >
                  {scenario.title}
                </span>
                <span className="text-[11px] text-muted line-clamp-1 mt-0.5">
                  {scenario.subtitle}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Backend Configuration Ribbon */}
      <div className="pt-3 border-t border-hairline/80">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <span className="text-muted text-[11px]">Backend Configuration:</span>

          <div className="flex flex-wrap items-center gap-3">
            {/* Rate Limiting */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted">Rate Limiter:</span>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-primary/15 text-primary">
                {config.rate_limit_max_requests} req / {config.rate_limit_window_seconds}s (X-Demo-Client-ID)
              </span>
            </div>

            {/* TTL */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted">TTL:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                  config.cache_ttl > 0
                    ? 'bg-success/15 text-success'
                    : 'bg-surface-soft text-muted'
                }`}
              >
                {config.cache_ttl > 0 ? `${config.cache_ttl / 1e9}s` : 'OFF'}
              </span>
            </div>

            {/* Invalidation on update */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted">Invalidate on Update:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                  config.invalidation_update
                    ? 'bg-success/15 text-success'
                    : 'bg-surface-soft text-muted'
                }`}
              >
                {config.invalidation_update ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* Negative Caching */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted">Negative Caching:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                  config.negative_cache
                    ? 'bg-success/15 text-success'
                    : 'bg-surface-soft text-muted'
                }`}
              >
                {config.negative_cache
                  ? `ON (${config.negative_cache_ttl / 1e9}s)`
                  : 'OFF'}
              </span>
            </div>

            {/* Stampede Singleflight */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted">Stampede Protection:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                  config.stampede_protection
                    ? 'bg-success/15 text-success'
                    : 'bg-surface-soft text-muted'
                }`}
              >
                {config.stampede_protection ? 'ON (SingleFlight)' : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
