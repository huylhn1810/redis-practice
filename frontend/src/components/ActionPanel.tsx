import React, { useState } from 'react'
import { ScenarioId, ScenarioMode } from '../types'
import { Play, Flame, RefreshCcw, Trash2, Zap, ArrowRight, CornerDownRight } from 'lucide-react'

interface ActionPanelProps {
  scenario: ScenarioId
  mode: ScenarioMode
  onGetProduct: (id: number) => Promise<void>
  onUpdatePrice: (id: number, newPrice: number) => Promise<void>
  onClearCache: () => Promise<void>
  onRunConcurrent: (id: number, count: number) => Promise<void>
  onRunStampedeBackend: () => Promise<void>
  onSeedProduct: () => Promise<void>
  onClearDatabase: () => Promise<void>
  isLoading: boolean
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  scenario,
  mode,
  onGetProduct,
  onUpdatePrice,
  onClearCache,
  onRunConcurrent,
  onRunStampedeBackend,
  onSeedProduct,
  onClearDatabase,
  isLoading,
}) => {
  const [customPrice, setCustomPrice] = useState(200)
  const [negativeId, setNegativeId] = useState(999)

  return (
    <div className="bg-surface-card rounded-lg border border-hairline p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-mono">
            4. Scenario Actions
          </h2>
        </div>
        <span className="text-xs font-mono text-muted">
          Current: <strong className="text-ink font-medium">{scenario}</strong> ({mode})
        </span>
      </div>

      {/* Scenario-Specific Action Controls */}
      <div className="p-4 bg-canvas rounded-lg border border-hairline space-y-3">
        {/* Cache Aside Scenario */}
        {scenario === 'cache-aside' && (
          <div className="space-y-2">
            <div className="text-xs text-muted">
              First GET product triggers <strong>CACHE MISS</strong> & <strong>DB QUERY</strong>. Subsequent GETs hit Redis directly.
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => onGetProduct(1)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary-active active:scale-95 transition-all rounded-md shadow-sm disabled:opacity-50"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>GET Product #1</span>
              </button>
              <button
                type="button"
                onClick={onClearCache}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-body bg-surface-soft hover:bg-surface-cream-strong active:scale-95 transition-all rounded-md border border-hairline disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted" />
                <span>Flush Redis Cache</span>
              </button>
            </div>
          </div>
        )}

        {/* Stale Cache Scenario */}
        {scenario === 'stale-cache' && (
          <div className="space-y-3">
            <div className="text-xs text-muted">
              {mode === 'before' ? (
                <span>
                  <strong>BEFORE:</strong> Updating product in DB does NOT invalidate Redis. Reading product again serves stale cached price!
                </span>
              ) : (
                <span>
                  <strong>AFTER:</strong> Updating product in DB automatically <strong>INVALIDATES</strong> the Redis key. Next read queries fresh DB data!
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onGetProduct(1)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-primary hover:bg-primary-active active:scale-95 transition-all rounded-md shadow-sm disabled:opacity-50"
              >
                <span>1. GET Product #1</span>
              </button>

              <div className="flex items-center gap-1 bg-surface-soft p-1 rounded-md border border-hairline">
                <span className="text-[11px] font-mono text-muted px-1.5">New Price: $</span>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  className="w-16 px-1.5 py-1 text-xs font-mono bg-canvas border border-hairline rounded text-ink"
                />
                <button
                  type="button"
                  onClick={() => onUpdatePrice(1, customPrice)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-ink bg-surface-card hover:bg-surface-cream-strong active:scale-95 transition-all rounded border border-hairline disabled:opacity-50"
                >
                  <RefreshCcw className="w-3 h-3 text-accent-amber" />
                  <span>2. Update Price</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onGetProduct(1)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-ink bg-surface-card hover:bg-surface-cream-strong active:scale-95 transition-all rounded-md border border-hairline disabled:opacity-50"
              >
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                <span>3. GET Product #1 Again</span>
              </button>
            </div>
          </div>
        )}

        {/* TTL Scenario */}
        {scenario === 'ttl' && (
          <div className="space-y-2">
            <div className="text-xs text-muted">
              {mode === 'before' ? (
                <span>
                  <strong>BEFORE:</strong> No TTL (TTL: OFF). Cached keys live indefinitely until manually flushed.
                </span>
              ) : (
                <span>
                  <strong>AFTER:</strong> TTL is set to 30 seconds. Redis will automatically expire the key.
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onGetProduct(1)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary-active active:scale-95 transition-all rounded-md shadow-sm disabled:opacity-50"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>GET Product #1 (Sets TTL)</span>
              </button>
              <button
                type="button"
                onClick={onClearCache}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-body bg-surface-soft hover:bg-surface-cream-strong active:scale-95 transition-all rounded-md border border-hairline disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted" />
                <span>Flush Redis Cache</span>
              </button>
            </div>
          </div>
        )}

        {/* Negative Caching Scenario */}
        {scenario === 'negative-caching' && (
          <div className="space-y-3">
            <div className="text-xs text-muted">
              {mode === 'before' ? (
                <span>
                  <strong>BEFORE:</strong> Querying a non-existent ID misses cache and hits DB every single time.
                </span>
              ) : (
                <span>
                  <strong>AFTER:</strong> First miss caches <code>"NOT FOUND"</code> with 10s TTL. Next 9 requests hit cache!
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-surface-soft p-1 rounded-md border border-hairline">
                <span className="text-[11px] font-mono text-muted px-1.5">Target ID:</span>
                <input
                  type="number"
                  value={negativeId}
                  onChange={(e) => setNegativeId(Number(e.target.value))}
                  className="w-16 px-1.5 py-1 text-xs font-mono bg-canvas border border-hairline rounded text-ink"
                />
              </div>

              <button
                type="button"
                onClick={() => onGetProduct(negativeId)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-primary hover:bg-primary-active active:scale-95 transition-all rounded-md shadow-sm disabled:opacity-50"
              >
                <span>Send 1 Request (ID: {negativeId})</span>
              </button>

              <button
                type="button"
                onClick={() => onRunConcurrent(negativeId, 10)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-ink bg-surface-card hover:bg-surface-cream-strong active:scale-95 transition-all rounded-md border border-hairline disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-accent-amber" />
                <span>Send 10 Sequential Requests</span>
              </button>

              <button
                type="button"
                onClick={onClearCache}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted hover:text-ink active:scale-95 transition-all rounded-md border border-hairline disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Flush Cache</span>
              </button>
            </div>
          </div>
        )}

        {/* Cache Stampede Scenario */}
        {scenario === 'cache-stampede' && (
          <div className="space-y-3">
            <div className="text-xs text-muted">
              {mode === 'before' ? (
                <span>
                  <strong>BEFORE:</strong> When cache expires, all concurrent requests miss and hammer MySQL simultaneously!
                </span>
              ) : (
                <span>
                  <strong>AFTER:</strong> <code>SingleFlight</code> collapses concurrent requests into <strong>1 single DB query</strong>!
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClearCache}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-error bg-error/10 hover:bg-error/20 active:scale-95 transition-all rounded-md border border-error/20 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>1. Flush Cache First</span>
              </button>

              <button
                type="button"
                onClick={onRunStampedeBackend}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary-active active:scale-95 transition-all rounded-md shadow-sm disabled:opacity-50"
              >
                <Flame className="w-3.5 h-3.5 text-accent-amber animate-pulse" />
                <span>2. Blast 100 Concurrent Goroutines (Backend Barrier)!</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Database Maintenance Utilities */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-mono text-muted">
        <span>Quick Utilities:</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSeedProduct}
            disabled={isLoading}
            className="px-2.5 py-1 text-[11px] rounded bg-surface-soft hover:bg-surface-cream-strong border border-hairline text-ink disabled:opacity-50"
          >
            Seed Product #1 ($100)
          </button>
          <button
            type="button"
            onClick={onClearCache}
            disabled={isLoading}
            className="px-2.5 py-1 text-[11px] rounded bg-surface-soft hover:bg-surface-cream-strong border border-hairline text-muted hover:text-ink disabled:opacity-50"
          >
            Flush Redis
          </button>
          <button
            type="button"
            onClick={onClearDatabase}
            disabled={isLoading}
            className="px-2.5 py-1 text-[11px] rounded bg-surface-soft hover:bg-surface-cream-strong border border-hairline text-error/80 hover:text-error disabled:opacity-50"
          >
            Truncate MySQL
          </button>
        </div>
      </div>
    </div>
  )
}
