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
}

export type ScenarioId =
  | 'cache-aside'
  | 'stale-cache'
  | 'ttl'
  | 'negative-caching'
  | 'cache-stampede'

export type ScenarioMode = 'before' | 'after'

export interface EventLogItem {
  id: string
  timestamp: string
  badge: string
  badgeType: 'hit' | 'miss' | 'db' | 'set' | 'delete' | 'error' | 'info'
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
