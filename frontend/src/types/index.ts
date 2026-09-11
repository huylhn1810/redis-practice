export interface Product {
  id: number
  name: string
  price: number
  stock: number
}

export interface Metrics {
  requests: number
  cache_hits: number
  cache_misses: number
  db_queries: number
  redis_errors: number
}

export interface BackendConfig {
  cache_ttl: number
  negative_cache_ttl: number
  negative_cache: boolean
  invalidation_update: boolean
  stampede_protection: boolean
  rate_limit_max_requests: number
  rate_limit_window_seconds: number
}

export type ScenarioId =
  | 'cache-aside'
  | 'stale-cache'
  | 'ttl'
  | 'negative-caching'
  | 'cache-stampede'
  | 'rate-limit'

export type ScenarioMode = 'before' | 'after'

export interface RateLimitDecision {
  allowed: boolean
  limit: number
  used: number
  remaining: number
  window_seconds: number
  reset_after_seconds: number
  retry_after_seconds: number
}

export interface RateLimitProbeResult {
  status: number
  message: string
  decision?: RateLimitDecision
}

export interface RateLimitStats {
  clientIP: string
  allowedCount: number
  blockedCount: number
  recentRequests: number
  currentLoad: number
  cooldownRemaining: number
  windowLimit: number
  windowSeconds: number
  lastStatus: 200 | 429 | null
  lastMessage?: string
}

export interface EventLogItem {
  id: string
  timestamp: string
  badge: string
  badgeType: 'hit' | 'miss' | 'db' | 'set' | 'delete' | 'error' | 'info' | 'ratelimit' | 'blocked'
  message: string
  source?: 'sse' | 'client'
}

export interface ScenarioInfo {
  id: ScenarioId
  title: string
  subtitle: string
  hasBeforeAfter: boolean
  beforeKey?: string
  afterKey?: string
  descriptionBefore: string
  descriptionAfter?: string
  expectedBefore: string[]
  expectedAfter?: string[]
}
