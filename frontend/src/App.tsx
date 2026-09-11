import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Header } from './components/Header'
import { ScenarioSelector } from './components/ScenarioSelector'
import { ProductState } from './components/ProductState'
import { MetricsPanel } from './components/MetricsPanel'
import { ActionPanel } from './components/ActionPanel'
import { EventLog } from './components/EventLog'
import { ComparisonGuide } from './components/ComparisonGuide'
import { api, subscribeSSE } from './api/api'
import {
  ScenarioId,
  ScenarioMode,
  Metrics,
  BackendConfig,
  Product,
  EventLogItem,
  RateLimitStats,
} from './types'

function formatTimestamp(): string {
  const now = new Date()
  return now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0')
}

export const App: React.FC = () => {
  // Scenario State
  const [scenario, setScenario] = useState<ScenarioId>('cache-aside')
  const [mode, setMode] = useState<ScenarioMode>('before')

  // Rate Limiting State
  const [clientIP, setClientIP] = useState<string>('192.168.1.10')
  const [rateLimitStats, setRateLimitStats] = useState<RateLimitStats>({
    clientIP: '192.168.1.10',
    allowedCount: 0,
    blockedCount: 0,
    recentRequests: 0,
    currentLoad: 0,
    cooldownRemaining: 0,
    windowLimit: 10,
    windowSeconds: 10,
    lastStatus: null,
    lastMessage: undefined,
  })

  // The latest backend decision is kept per simulated client.
  const rateLimitStatsByClientRef = useRef<Record<string, RateLimitStats>>({})

  // Data & Backend State
  const [metrics, setMetrics] = useState<Metrics>({
    requests: 0,
    cache_hits: 0,
    cache_misses: 0,
    db_queries: 0,
    redis_errors: 0,
  })
  const [config, setConfig] = useState<BackendConfig>({
    cache_ttl: 0,
    negative_cache_ttl: 0,
    negative_cache: false,
    invalidation_update: false,
    stampede_protection: false,
    rate_limit_max_requests: 10,
    rate_limit_window_seconds: 10,
  })
  const [dbProduct, setDbProduct] = useState<Product | null>(null)
  const [redisProduct, setRedisProduct] = useState<any | null>(null)
  const [targetId, setTargetId] = useState<number>(1)
  const [allDbProducts, setAllDbProducts] = useState<Product[]>([])
  const [allCacheItems, setAllCacheItems] = useState<any[]>([])

  // System & Logging
  const [logs, setLogs] = useState<EventLogItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isResetting, setIsResetting] = useState<boolean>(false)
  const [isSeeding, setIsSeeding] = useState<boolean>(false)
  const [sseConnected, setSseConnected] = useState<boolean>(false)

  // Prevent duplicate consecutive logs within 150ms
  const lastLogRef = useRef<{ key: string; time: number }>({ key: '', time: 0 })

  // Append a log entry
  const addLog = useCallback(
    (
      badge: string,
      badgeType: EventLogItem['badgeType'],
      message: string,
      source: 'sse' | 'client' = 'client'
    ) => {
      const now = Date.now()
      const key = `${badge}:${message}`
      if (lastLogRef.current.key === key && now - lastLogRef.current.time < 150) {
        return
      }
      lastLogRef.current = { key, time: now }

      const item: EventLogItem = {
        id: `${now}-${Math.random()}`,
        timestamp: formatTimestamp(),
        badge,
        badgeType,
        message,
        source,
      }
      setLogs((prev) => [...prev.slice(-150), item])
    },
    []
  )

  // Refresh data from backend
  const refreshData = useCallback(async (currentId: number = targetId) => {
    try {
      // 1. Fetch Metrics & Config
      const [m, cfg] = await Promise.all([api.getMetrics(), api.getConfig()])
      setMetrics(m)
      setConfig(cfg)
      setRateLimitStats((previous) => ({
        ...previous,
        windowLimit: cfg.rate_limit_max_requests,
        windowSeconds: cfg.rate_limit_window_seconds,
      }))

      // 2. Fetch MySQL Database state
      const allDb = await api.getAllProducts()
      setAllDbProducts(allDb)
      const foundDb = allDb.find((p) => Number(p.id) === Number(currentId)) || null
      setDbProduct(foundDb)

      // 3. Fetch Redis state
      const allCache = await api.getCacheDB()
      setAllCacheItems(allCache)
      let foundRedis: any = null
      for (const item of allCache) {
        if (typeof item === 'string') {
          let decoded = item
          try {
            decoded = atob(item)
          } catch {
            // Not base64, keep original
          }
          if (item.includes('NOT FOUND') || decoded.includes('NOT FOUND')) {
            if (Number(currentId) === 999 || !foundDb) {
              foundRedis = 'NOT FOUND'
              break
            }
          }
        } else if (item && typeof item === 'object' && Number(item.id) === Number(currentId)) {
          foundRedis = item
          break
        }
      }
      setRedisProduct(foundRedis)
    } catch (err) {
      console.error('Failed refreshing data:', err)
    }
  }, [targetId])

  // Setup SSE stream on mount
  useEffect(() => {
    addLog('SYSTEM', 'info', 'Connecting to Backend SSE event stream...')
    const unsubscribe = subscribeSSE(
      (msg) => {
        const cleanMsg = msg.trim()

        if (cleanMsg.includes('CACHE HIT')) {
          addLog('CACHE HIT', 'hit', 'Redis cache hit', 'sse')
        } else if (cleanMsg.includes('DATABASE QUERY')) {
          addLog('DB QUERY', 'db', 'MySQL SELECT query executed', 'sse')
        } else if (cleanMsg.includes('CLEAR DATA MYSQL')) {
          addLog('CLEAR DB', 'delete', 'MySQL products table truncated', 'sse')
        } else if (cleanMsg.includes('CLEAR DATA REDIS')) {
          addLog('FLUSH REDIS', 'delete', 'Redis FLUSHDB executed', 'sse')
        } else {
          addLog('EVENT', 'info', cleanMsg, 'sse')
        }
      },
      (connected) => {
        setSseConnected(connected)
      }
    )

    return () => {
      unsubscribe()
      setSseConnected(false)
    }
  }, [addLog])

  // Polling metrics & state every 2.5 seconds
  useEffect(() => {
    refreshData(targetId)
    const interval = setInterval(() => {
      refreshData(targetId)
    }, 2500)
    return () => clearInterval(interval)
  }, [refreshData, targetId])

  // Map Scenario & Mode to Backend Scenario String
  const getBackendScenarioKey = (sc: ScenarioId, md: ScenarioMode): string => {
    switch (sc) {
      case 'cache-aside':
        return 'stale-before' // Default no ttl, no invalidation
      case 'stale-cache':
        return md === 'before' ? 'stale-before' : 'stale-after'
      case 'ttl':
        return md === 'before' ? 'ttl-before' : 'ttl-after'
      case 'negative-caching':
        return md === 'before' ? 'negative-before' : 'negative-after'
      case 'cache-stampede':
        return md === 'before' ? 'stampede-before' : 'stampede-after'
      case 'rate-limit':
        return 'stale-before' // Safe fallback for demo scenario store
    }
  }

  // Handle scenario switch
  const handleSelectScenario = async (newScenario: ScenarioId, newMode: ScenarioMode) => {
    setScenario(newScenario)
    const key = getBackendScenarioKey(newScenario, newMode)
    setIsLoading(true)
    try {
      if (newScenario === 'rate-limit') {
        addLog(
          'SCENARIO',
          'info',
          `Switched scenario to [Rate Limiting] (Redis sliding-window counter)`
        )
      } else {
        await api.setScenario(key)
        addLog('SCENARIO', 'info', `Switched scenario to [${newScenario}] -> mode [${newMode}] (Key: ${key})`)
      }
      await refreshData(targetId)
    } catch (err: any) {
      addLog('ERROR', 'error', `Failed to set scenario: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle mode switch (before / after)
  const handleSelectMode = async (newMode: ScenarioMode) => {
    setMode(newMode)
    const key = getBackendScenarioKey(scenario, newMode)
    setIsLoading(true)
    try {
      if (scenario !== 'rate-limit') {
        await api.setScenario(key)
      }
      addLog('MODE', 'info', `Switched mode to [${newMode.toUpperCase()}] for ${scenario}`)
      await refreshData(targetId)
    } catch (err: any) {
      addLog('ERROR', 'error', `Failed to set mode: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Action: Test Rate Limiter with a simulated client ID
  const handleTestRateLimit = async (ip: string, count: number = 1) => {
    if (isLoading) return
    setIsLoading(true)
    setClientIP(ip)
    addLog(
      'RATE LIMIT',
      'info',
      `Sending ${count} request(s) with X-Demo-Client-ID: ${ip} to POST /api/v1/demo/ratelimit...`
    )

    let allowed = 0
    let blocked = 0

    try {
      const requests = Array.from({ length: count }, () => api.sendRateLimitProbe(ip))
      const results = await Promise.all(requests)

      results.forEach((res, i) => {
        if (res.status === 429) {
          blocked++
          addLog(
            '429 BLOCKED',
            'blocked',
            `[Req #${i + 1}] IP ${ip} exceeded limit: ${res.message || 'too many requests'}`
          )
        } else if (res.status >= 200 && res.status < 300) {
          allowed++
          addLog(
            '200 OK',
            'hit',
            `[Req #${i + 1}] IP ${ip} allowed by Redis sliding window`
          )
        } else {
          addLog(
            `HTTP ${res.status}`,
            'error',
            `[Req #${i + 1}] IP ${ip} response: ${res.message}`
          )
        }
      })

      const previous = rateLimitStatsByClientRef.current[ip]
      const hadBlocked = blocked > 0
      const decision = results
        .filter((result) => !hadBlocked || result.status === 429)
        .flatMap((result) => (result.decision ? [result.decision] : []))
        .sort(
          (left, right) =>
            right.used - left.used || right.retry_after_seconds - left.retry_after_seconds
        )[0]

      if (!decision) {
        throw new Error('Backend did not return a rate-limit decision')
      }

      const nextStats: RateLimitStats = {
        clientIP: ip,
        allowedCount: (previous?.allowedCount ?? 0) + allowed,
        blockedCount: (previous?.blockedCount ?? 0) + blocked,
        recentRequests: decision.used,
        currentLoad: decision.used,
        cooldownRemaining: hadBlocked
          ? decision.retry_after_seconds
          : decision.reset_after_seconds,
        windowLimit: decision.limit,
        windowSeconds: decision.window_seconds,
        lastStatus: hadBlocked ? 429 : 200,
        lastMessage: hadBlocked
          ? `HTTP 429: retry after ${decision.retry_after_seconds}s (${decision.used}/${decision.limit} used)`
          : `HTTP 200: ${decision.remaining}/${decision.limit} requests remaining`,
      }
      rateLimitStatsByClientRef.current[ip] = nextStats
      setRateLimitStats(nextStats)

      await refreshData(targetId)
    } catch (err: any) {
      addLog('ERROR', 'error', `Rate limit test failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Action: GET Product
  const handleGetProduct = async (id: number) => {
    if (isLoading) return
    setTargetId(id)
    setIsLoading(true)
    addLog('REQUEST', 'info', `GET /api/v1/products/${id}`)
    try {
      const res = await api.getProduct(id)
      if (res.product) {
        addLog(
          '200 OK',
          'hit',
          `Returned product #${id} (${res.product.name}) - Price: $${res.product.price}`
        )
      } else {
        addLog('400/404', 'miss', `Product #${id} not found in DB: ${res.error}`)
      }
      await refreshData(id)
    } catch (err: any) {
      addLog('ERROR', 'error', `GET request failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Action: Update Product Price
  const handleUpdatePrice = async (id: number, newPrice: number) => {
    if (isLoading) return
    setTargetId(id)
    setIsLoading(true)
    addLog('REQUEST', 'info', `PUT /api/v1/products/${id} -> Price: $${newPrice}`)
    try {
      const current = dbProduct || {
        id,
        name: 'Mechanical Keyboard',
        price: 100,
        stock: 50,
      }
      await api.updateProduct(id, { ...current, price: newPrice })
      addLog('UPDATE DB', 'db', `Updated Product #${id} in MySQL to $${newPrice}`)
      if (config.invalidation_update) {
        addLog('INVALIDATE', 'delete', `Cache invalidation triggered: deleted product:${id} from Redis`)
      }
      await refreshData(id)
    } catch (err: any) {
      addLog('ERROR', 'error', `Update failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Action: Clear Cache
  const handleClearCache = async () => {
    if (isLoading) return
    setIsLoading(true)
    addLog('REQUEST', 'info', 'DELETE /api/v1/cache (FLUSHDB)')
    try {
      await api.clearCache()
      addLog('FLUSH CACHE', 'delete', 'Redis cache flushed completely (Rate limit counters reset)')
      rateLimitStatsByClientRef.current = {}
      setRateLimitStats((prev) => ({
        ...prev,
        recentRequests: 0,
        currentLoad: 0,
        cooldownRemaining: 0,
        allowedCount: 0,
        blockedCount: 0,
        lastStatus: null,
        lastMessage: 'Redis flushed: all rate limit counters reset to 0',
      }))
      await refreshData(targetId)
    } catch (err: any) {
      addLog('ERROR', 'error', `Clear cache failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Action: Clear MySQL Database
  const handleClearDatabase = async () => {
    if (isLoading) return
    setIsLoading(true)
    addLog('REQUEST', 'info', 'DELETE /api/v1/products (TRUNCATE TABLE)')
    try {
      await api.clearDatabase()
      addLog('TRUNCATE DB', 'delete', 'MySQL products table truncated')
      await refreshData(targetId)
    } catch (err: any) {
      addLog('ERROR', 'error', `Clear database failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Action: Run Concurrent Requests (Stampede / Negative Caching)
  const handleRunConcurrent = async (id: number, count: number) => {
    if (isLoading) return
    setTargetId(id)
    setIsLoading(true)
    addLog(
      'CONCURRENT',
      'info',
      `Sending ${count} concurrent requests to GET /api/v1/products/${id}...`
    )

    const startTime = performance.now()
    try {
      const requests = Array.from({ length: count }, (_, i) =>
        api.getProduct(id, `${Date.now()}_${i}`)
      )
      const results = await Promise.all(requests)
      const duration = Math.round(performance.now() - startTime)

      const successes = results.filter((r) => r.product).length
      const missesOrErrors = count - successes

      addLog(
        'BATCH DONE',
        'hit',
        `Completed ${count} requests in ${duration}ms! (Success: ${successes}, Missing/400: ${missesOrErrors})`
      )
      await refreshData(id)
    } catch (err: any) {
      addLog('ERROR', 'error', `Concurrent batch failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Action: Run Backend Concurrent Stampede (100 goroutines)
  const handleRunStampedeBackend = async () => {
    if (isLoading) return
    setIsLoading(true)
    addLog(
      'STAMPEDE',
      'info',
      'Triggering 100 concurrent goroutines on Backend (POST /api/v1/demo/stampede)...'
    )
    const startTime = performance.now()
    try {
      const res = await api.runStampede()
      const duration = Math.round(performance.now() - startTime)
      addLog(
        'STAMPEDE DONE',
        'hit',
        `Backend stampede finished in ${duration}ms! ${res?.data?.message || '100 goroutines executed'}`
      )
      await refreshData(1)
    } catch (err: any) {
      addLog('ERROR', 'error', `Backend stampede failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Action: Seed Product #1
  const handleSeedProduct = async () => {
    if (isSeeding) return
    setIsSeeding(true)
    addLog('SEEDING', 'info', 'POST /api/v1/products (Product #1: Mechanical Keyboard, $100)')
    try {
      await api.createProduct({
        id: 1,
        name: 'Mechanical Keyboard',
        price: 100,
        stock: 50,
      })
      addLog('SEED SUCCESS', 'db', 'Product #1 created in MySQL successfully')
      setTargetId(1)
      await refreshData(1)
    } catch (err: any) {
      addLog('SEED INFO', 'info', 'Product #1 might already exist, attempting refresh...')
      await refreshData(1)
    } finally {
      setIsSeeding(false)
    }
  }

  // Action: Reset Demo Environment
  const handleReset = async () => {
    if (isResetting) return
    setIsResetting(true)
    addLog('RESET', 'delete', 'POST /api/v1/demo/reset')
    try {
      await api.resetDemo()
      setScenario('cache-aside')
      setMode('before')
      addLog('RESET OK', 'info', 'Default scenario restored and metrics reset')
      await refreshData(1)
    } catch (err: any) {
      addLog('ERROR', 'error', `Reset failed: ${err.message}`)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-body flex flex-col selection:bg-primary/20">
      {/* Editorial Header */}
      <Header
        onReset={handleReset}
        onSeed={handleSeedProduct}
        isResetting={isResetting}
        isSeeding={isSeeding}
        sseConnected={sseConnected}
      />

      {/* Main Single-Page Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Row 1: Scenario Selector */}
        <ScenarioSelector
          currentScenario={scenario}
          currentMode={mode}
          config={config}
          onSelectScenario={handleSelectScenario}
          onSelectMode={handleSelectMode}
          disabled={isLoading}
        />

        {/* Row 2: Two Columns: Current State & Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProductState
            dbProduct={dbProduct}
            redisProduct={redisProduct}
            allDbProducts={allDbProducts}
            allCacheItems={allCacheItems}
            productId={targetId}
            isLoading={isLoading}
            isRateLimitScenario={scenario === 'rate-limit'}
            rateLimitStats={rateLimitStats}
            onSelectProduct={(id) => {
              setTargetId(id)
              refreshData(id)
            }}
          />
          <MetricsPanel
            metrics={metrics}
            isRateLimitScenario={scenario === 'rate-limit'}
            rateLimitStats={rateLimitStats}
          />
        </div>

        {/* Row 3: Action Panel */}
        <ActionPanel
          scenario={scenario}
          mode={mode}
          onGetProduct={handleGetProduct}
          onUpdatePrice={handleUpdatePrice}
          onClearCache={handleClearCache}
          onRunConcurrent={handleRunConcurrent}
          onRunStampedeBackend={handleRunStampedeBackend}
          onSeedProduct={handleSeedProduct}
          onClearDatabase={handleClearDatabase}
          isLoading={isLoading}
          rateLimitStats={rateLimitStats}
          onTestRateLimit={handleTestRateLimit}
          currentClientIP={clientIP}
          onChangeClientIP={(ip) => {
            setClientIP(ip)
            setRateLimitStats(
              rateLimitStatsByClientRef.current[ip] || {
                clientIP: ip,
                allowedCount: 0,
                blockedCount: 0,
                recentRequests: 0,
                currentLoad: 0,
                cooldownRemaining: 0,
                windowLimit: config.rate_limit_max_requests,
                windowSeconds: config.rate_limit_window_seconds,
                lastStatus: null,
                lastMessage: `Active client switched to ${ip}`,
              }
            )
          }}
        />

        {/* Row 4: Event Log (Dark Obsidian Surface) */}
        <EventLog
          logs={logs}
          onClearLogs={() => setLogs([])}
          sseConnected={sseConnected}
        />

        {/* Row 5: Educational Comparison Guide */}
        <ComparisonGuide scenario={scenario} mode={mode} />
      </main>

      {/* Minimal Warm Editorial Footer */}
      <footer className="border-t border-hairline py-6 text-center text-xs font-mono text-muted">
        <p>Redis Practice Dashboard — Warm-Canvas Editorial System</p>
      </footer>
    </div>
  )
}

export default App
