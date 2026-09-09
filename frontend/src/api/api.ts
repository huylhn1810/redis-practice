import axios from 'axios'
import { BackendConfig, Metrics, Product } from '../types'

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

export const api = {
  // Demo API
  async setScenario(scenario: string) {
    const res = await apiClient.post('/demo/scenario', {
      scenario,
      senario: scenario, // Backward-compatibility
    })
    return res.data
  },

  async resetDemo() {
    const res = await apiClient.post('/demo/reset')
    return res.data
  },

  async getMetrics(): Promise<Metrics> {
    const res = await apiClient.get('/demo/metrics')
    const raw = res.data?.data?.metrics || {}
    const cache_hits = Number(raw.cache_hit ?? 0)
    const cache_misses = Number(raw.cache_miss ?? 0)
    const db_queries = Number(raw.db_query ?? 0)
    return {
      requests: cache_hits + cache_misses,
      cache_hits,
      cache_misses,
      db_queries,
      redis_errors: 0,
    }
  },

  async getConfig(): Promise<BackendConfig> {
    const res = await apiClient.get('/demo/config')
    const cfg = res.data?.data?.config || {}
    return {
      cache_ttl: Number(cfg.cache_ttl ?? 0),
      negative_cache_ttl: Number(cfg.negative_cache_ttl ?? 0),
      negative_cache: Boolean(cfg.negative_cache),
      invalidation_update: Boolean(cfg.invalidation_update),
      stampede_protection: Boolean(cfg.stampede_protection),
    }
  },

  // Products API (Database)
  async getProduct(id: number, cacheBuster?: string | number): Promise<{ product?: Product; error?: string; status: number }> {
    try {
      const url = cacheBuster !== undefined ? `/products/${id}?_cb=${cacheBuster}` : `/products/${id}`
      const res = await apiClient.get(url)
      return { product: res.data?.data?.product, status: res.status }
    } catch (err: any) {
      return {
        error: err.response?.data?.data?.message || err.message || 'Product not found',
        status: err.response?.status || 500,
      }
    }
  },

  async getAllProducts(): Promise<Product[]> {
    try {
      const res = await apiClient.get('/products')
      return res.data?.data?.products || []
    } catch (err) {
      console.error('Error getting all products:', err)
      return []
    }
  },

  async createProduct(product: Product) {
    const res = await apiClient.post('/products', product)
    return res.data
  },

  async updateProduct(id: number, product: Product) {
    const res = await apiClient.put(`/products/${id}`, product)
    return res.data
  },

  async deleteProduct(id: number) {
    const res = await apiClient.delete(`/products/${id}`)
    return res.data
  },

  async clearDatabase() {
    const res = await apiClient.delete('/products')
    return res.data
  },

  // Cache API (Redis)
  async getCacheDB(): Promise<any[]> {
    try {
      const res = await apiClient.get('/cache')
      return res.data?.data?.db || []
    } catch (err) {
      console.error('Error reading Redis cache:', err)
      return []
    }
  },

  async clearCache() {
    const res = await apiClient.delete('/cache')
    return res.data
  },

  async runStampede() {
    const res = await apiClient.post('/demo/stampede')
    return res.data
  },
}

/**
 * Resilient SSE listener supporting raw text chunk streaming, status updates,
 * and automatic reconnect when backend restarts or becomes available.
 */
export function subscribeSSE(
  onMessage: (log: string) => void,
  onStatusChange?: (connected: boolean) => void
): () => void {
  let isAborted = false
  let currentController: AbortController | null = null

  const startStream = async () => {
    if (isAborted) return
    currentController = new AbortController()

    try {
      const res = await fetch('/api/v1/demo/events', {
        signal: currentController.signal,
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      // Mark connected as soon as response headers arrive
      onStatusChange?.(true)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (!isAborted) {
        const { done, value } = await reader.read()
        if (done) break

        onStatusChange?.(true)

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean)

        for (const line of lines) {
          // Skip SSE comments like ": ping"
          if (line.startsWith(':')) continue
          const clean = line.replace(/^data:\s*/, '').trim()
          if (clean) {
            onMessage(clean)
          }
        }
      }
    } catch (err: any) {
      // Ignore user-initiated aborts
      if (err.name === 'AbortError' || isAborted) {
        return
      }
      onStatusChange?.(false)
      // Retry connection every 2 seconds if backend is not ready
      setTimeout(() => {
        if (!isAborted) startStream()
      }, 2000)
      return
    }

    // If stream ended naturally (server closed) and not aborted by client, reconnect
    if (!isAborted) {
      onStatusChange?.(false)
      setTimeout(() => {
        if (!isAborted) startStream()
      }, 2000)
    }
  }

  startStream()

  return () => {
    isAborted = true
    onStatusChange?.(false)
    if (currentController) {
      currentController.abort()
    }
  }
}
