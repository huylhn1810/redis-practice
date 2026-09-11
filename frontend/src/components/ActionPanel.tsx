import React, { useState, useEffect } from 'react'
import { ScenarioId, ScenarioMode, RateLimitStats } from '../types'
import {
  Play,
  Flame,
  RefreshCcw,
  Trash2,
  Zap,
  ArrowRight,
  CornerDownRight,
  Users,
  Send,
  Activity,
  Clock,
  CheckCircle,
} from 'lucide-react'

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
  rateLimitStats?: RateLimitStats
  onTestRateLimit?: (clientIP: string, count: number) => Promise<void>
  currentClientIP?: string
  onChangeClientIP?: (ip: string) => void
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
  rateLimitStats,
  onTestRateLimit,
  currentClientIP = '192.168.1.10',
  onChangeClientIP,
}) => {
  const [customPrice, setCustomPrice] = useState(200)
  const [negativeId, setNegativeId] = useState(999)
  const [activeIP, setActiveIP] = useState(currentClientIP)

  useEffect(() => {
    setActiveIP(currentClientIP)
  }, [currentClientIP])

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
          Current: <strong className="text-ink font-medium">{scenario}</strong>
          {scenario !== 'cache-aside' && scenario !== 'rate-limit' && ` (${mode})`}
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

        {/* Rate Limiting Scenario */}
        {scenario === 'rate-limit' && (
          <div className="space-y-4">
            <div className="text-xs text-muted">
              <span>
                Redis Sliding Window Counter protects <code>POST /api/v1/demo/ratelimit</code> per simulated client (<code>X-Demo-Client-ID</code>).
                Limit: <strong>{rateLimitStats?.windowLimit ?? 0} requests / {rateLimitStats?.windowSeconds ?? 0}s</strong>. Requests over the estimated quota receive <strong>HTTP 429 Too Many Requests</strong>.
              </span>
            </div>

            {/* IP Simulator & Quick Switch */}
            <div className="p-3.5 bg-surface-soft rounded-lg border border-hairline space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent-teal" />
                  <span className="text-xs font-mono font-medium text-ink">
                    Simulate Client (<code>X-Demo-Client-ID</code> header):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={activeIP}
                    onChange={(e) => {
                      setActiveIP(e.target.value)
                      onChangeClientIP?.(e.target.value)
                    }}
                    placeholder="e.g. 192.168.1.10"
                    className="px-2.5 py-1 text-xs font-mono bg-canvas border border-hairline rounded text-ink w-40 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-mono text-muted">Quick Switch:</span>
                {[
                  { label: 'Client A', ip: '192.168.1.10' },
                  { label: 'Client B', ip: '10.0.0.5' },
                  { label: 'Client C', ip: '172.16.0.99' },
                ].map((preset) => (
                  <button
                    key={preset.ip}
                    type="button"
                    onClick={() => {
                      setActiveIP(preset.ip)
                      onChangeClientIP?.(preset.ip)
                    }}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-all ${
                      activeIP === preset.ip
                        ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm'
                        : 'bg-canvas border-hairline text-muted hover:text-ink hover:border-hairline'
                    }`}
                  >
                    {preset.label} ({preset.ip})
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const rand = `192.168.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 200) + 10}`
                    setActiveIP(rand)
                    onChangeClientIP?.(rand)
                  }}
                  className="px-2.5 py-1 text-[11px] font-mono rounded border border-hairline bg-canvas text-muted hover:text-ink"
                >
                  + Random IP
                </button>
                <span className="text-[10px] text-muted italic ml-auto hidden sm:inline">
                  (Demonstrates IP isolation: Client B works even if Client A hits 429)
                </span>
              </div>
            </div>

            {/* Visual Meter & Status Card */}
            {(() => {
              const currentLoad = rateLimitStats?.currentLoad ?? rateLimitStats?.recentRequests ?? 0
              const windowLimit = rateLimitStats?.windowLimit || 1
              const windowSeconds = rateLimitStats?.windowSeconds || 1
              const percentage = Math.min(100, Math.max(0, (currentLoad / windowLimit) * 100))
              const cooldownSec = rateLimitStats?.cooldownRemaining || 0
              const isBlocked = rateLimitStats?.lastStatus === 429

              return (
                <div className="p-3.5 bg-canvas rounded-lg border border-hairline space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                      <span className="text-muted">
                        Sliding Window Quota for <strong className="text-ink">{activeIP}</strong>:
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                          isBlocked
                            ? 'bg-error/20 text-error border border-error/40 animate-pulse'
                            : rateLimitStats?.lastStatus === 200
                            ? 'bg-success/20 text-success border border-success/40'
                            : 'bg-surface-soft text-muted border border-hairline'
                        }`}
                      >
                        {isBlocked
                          ? `⛔ 429 — RETRY AFTER ${cooldownSec}s`
                          : rateLimitStats?.lastStatus === 200
                          ? '✓ 200 ALLOWED'
                          : 'READY'}
                      </span>
                      <span className="font-bold text-ink text-sm font-mono">
                        {currentLoad.toFixed(1)} / {windowLimit} reqs
                      </span>
                    </div>
                  </div>

                  {/* Snapshot returned by the latest Redis rate-limit decision. */}
                  <div className="w-full bg-surface-soft h-3 rounded-full overflow-hidden border border-hairline/60">
                    <div
                      className={`h-full transition-all duration-100 ease-linear ${
                        percentage >= 95
                          ? 'bg-error'
                          : percentage >= 65
                          ? 'bg-accent-amber'
                          : 'bg-success'
                      }`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  {/* Redis decision details */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] font-mono gap-2 pt-0.5">
                    {rateLimitStats?.lastStatus !== null ? (
                      <span className="flex items-center gap-1.5 text-accent-amber">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {isBlocked ? 'Retry allowed in ' : 'Current fixed bucket resets in '}
                          <strong className="text-ink font-semibold">{cooldownSec}s</strong>
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-success">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>No request sent yet. Limit: {windowLimit} requests / {windowSeconds}s.</span>
                      </span>
                    )}
                    <div className="flex items-center gap-3 ml-auto text-muted">
                      <span className="text-success font-medium">
                        Allowed (200): {rateLimitStats?.allowedCount || 0}
                      </span>
                      <span className="text-hairline">|</span>
                      <span className="text-error font-semibold">
                        Blocked (429): {rateLimitStats?.blockedCount || 0}
                      </span>
                    </div>
                  </div>

                  {/* Status Message Detail */}
                  {rateLimitStats?.lastMessage && (
                    <div className="text-[10px] font-mono text-muted/80 border-t border-hairline/40 pt-1.5 truncate">
                      Latest: <span className={rateLimitStats.lastStatus === 429 ? 'text-error' : 'text-body'}>{rateLimitStats.lastMessage}</span>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Action Traffic Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onTestRateLimit?.(activeIP, 1)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-primary hover:bg-primary-active active:scale-95 transition-all rounded-md shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send 1 Request</span>
              </button>

              <button
                type="button"
                onClick={() => onTestRateLimit?.(activeIP, 5)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-ink bg-surface-card hover:bg-surface-cream-strong active:scale-95 transition-all rounded-md border border-hairline disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-accent-amber" />
                <span>Send 5 Requests</span>
              </button>

              <button
                type="button"
                onClick={() => onTestRateLimit?.(activeIP, 12)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-error bg-error/15 hover:bg-error/25 active:scale-95 transition-all rounded-md border border-error/30 disabled:opacity-50"
                title="Send 12 rapid requests to exceed the limit and trigger HTTP 429"
              >
                <Flame className="w-3.5 h-3.5 animate-pulse text-error" />
                <span>Spam 12 Requests (Trigger 429 Block!)</span>
              </button>

              <button
                type="button"
                onClick={onClearCache}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted hover:text-ink active:scale-95 transition-all rounded-md border border-hairline disabled:opacity-50 sm:ml-auto"
                title="Flush Redis cache to clear sliding window keys and reset counters"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Flush Redis (Reset Quotas)</span>
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
