import React, { useState } from 'react'
import { Product, RateLimitStats } from '../types'
import {
  Database,
  Server,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  HardDrive,
  Table,
  Eye,
  ShieldAlert,
} from 'lucide-react'

interface ProductStateProps {
  dbProduct: Product | null | undefined
  redisProduct: any | null | undefined
  allDbProducts?: Product[]
  allCacheItems?: any[]
  productId: number
  isLoading?: boolean
  onSelectProduct?: (id: number) => void
  isRateLimitScenario?: boolean
  rateLimitStats?: RateLimitStats
}

export const ProductState: React.FC<ProductStateProps> = ({
  dbProduct,
  redisProduct,
  allDbProducts = [],
  allCacheItems = [],
  productId,
  isLoading,
  onSelectProduct,
  isRateLimitScenario,
  rateLimitStats,
}) => {
  const [viewMode, setViewMode] = useState<'focused' | 'all'>('focused')

  // Determine cache comparison state
  const isRedisEmpty = redisProduct === null || redisProduct === undefined
  const isRedisNotFound =
    redisProduct === 'NOT FOUND' ||
    (typeof redisProduct === 'string' && redisProduct.includes('NOT FOUND'))
  const isDbEmpty = dbProduct === null || dbProduct === undefined

  // Check for stale cache
  const isStale =
    !isDbEmpty &&
    !isRedisEmpty &&
    !isRedisNotFound &&
    typeof redisProduct === 'object' &&
    (dbProduct?.price !== redisProduct?.price || dbProduct?.stock !== redisProduct?.stock)

  // In sync check
  const isInSync =
    !isDbEmpty &&
    !isRedisEmpty &&
    !isRedisNotFound &&
    typeof redisProduct === 'object' &&
    dbProduct?.price === redisProduct?.price &&
    dbProduct?.stock === redisProduct?.stock

  return (
    <div className="bg-surface-card rounded-lg border border-hairline p-5 shadow-sm space-y-4">
      {/* Card Header with View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-mono">
            2. State Inspector {viewMode === 'focused' ? `(Product #${productId})` : '(Full Database & Cache)'}
          </h2>
        </div>

        {/* Tab Switcher: Focused vs All Records */}
        <div className="flex items-center gap-1 bg-canvas p-1 rounded-md border border-hairline self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('focused')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded transition-all ${
              viewMode === 'focused'
                ? 'bg-surface-soft text-ink font-semibold shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Product #{productId}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded transition-all ${
              viewMode === 'all'
                ? 'bg-surface-soft text-ink font-semibold shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>
              All Data ({allDbProducts.length} DB / {allCacheItems.length} Redis)
            </span>
          </button>
        </div>
      </div>

      {/* VIEW 1: FOCUSED COMPARISON FOR TARGET PRODUCT */}
      {viewMode === 'focused' && (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted">Comparison Result:</span>
            <div>
              {isLoading ? (
                <span className="px-2.5 py-1 text-xs font-mono rounded-pill bg-surface-soft text-muted animate-pulse">
                  Reading states...
                </span>
              ) : isStale ? (
                <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded-pill bg-warning/15 text-warning border border-warning/30 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ⚠ STALE CACHE DETECTED
                </span>
              ) : isRedisNotFound ? (
                <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded-pill bg-accent-teal/15 text-accent-teal border border-accent-teal/30">
                  <CheckCircle className="w-3.5 h-3.5" />
                  NEGATIVE CACHE (NOT FOUND)
                </span>
              ) : isInSync ? (
                <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded-pill bg-success/15 text-success border border-success/30">
                  <CheckCircle className="w-3.5 h-3.5" />
                  ✓ IN SYNC
                </span>
              ) : isRedisEmpty && !isDbEmpty ? (
                <span className="px-2.5 py-1 text-xs font-mono rounded-pill bg-surface-soft text-muted border border-hairline">
                  Cache Miss (Not in Redis)
                </span>
              ) : (
                <span className="px-2.5 py-1 text-xs font-mono rounded-pill bg-surface-soft text-muted border border-hairline">
                  No Data
                </span>
              )}
            </div>
          </div>

          {/* Rate Limiting Active Banner / Inspector */}
          {isRateLimitScenario && (
            <div className="p-3 bg-surface-soft rounded-lg border border-hairline/80 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-ink uppercase tracking-wider">
                    Rate Limit Inspector (Redis Sliding Window)
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    rateLimitStats?.lastStatus === 429
                      ? 'bg-error/20 text-error border border-error/40 animate-pulse'
                      : rateLimitStats?.lastStatus === 200
                      ? 'bg-success/20 text-success border border-success/40'
                      : 'bg-canvas text-muted border border-hairline'
                  }`}
                >
                  {rateLimitStats?.lastStatus === 429
                    ? '429 TOO MANY REQUESTS'
                    : rateLimitStats?.lastStatus === 200
                    ? '200 WITHIN LIMIT'
                    : 'STANDBY'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div className="bg-canvas p-2 rounded border border-hairline/60">
                  <div className="text-muted">Client ID:</div>
                  <div className="font-semibold text-ink truncate">{rateLimitStats?.clientIP || '192.168.1.10'}</div>
                </div>
                <div className="bg-canvas p-2 rounded border border-hairline/60">
                  <div className="text-muted">Window Quota:</div>
                  <div className="font-semibold text-ink">
                    {rateLimitStats?.windowLimit ?? 0} req / {rateLimitStats?.windowSeconds ?? 0}s
                  </div>
                </div>
                <div className="bg-canvas p-2 rounded border border-hairline/60">
                  <div className="text-muted">Current Load:</div>
                  <div
                    className={`font-semibold ${
                      (rateLimitStats?.currentLoad || 0) >= (rateLimitStats?.windowLimit || 1) * 0.95
                        ? 'text-error'
                        : (rateLimitStats?.currentLoad || 0) >= (rateLimitStats?.windowLimit || 1) * 0.65
                        ? 'text-accent-amber'
                        : 'text-primary'
                    }`}
                  >
                    {(rateLimitStats?.currentLoad ?? rateLimitStats?.recentRequests ?? 0).toFixed(1)} / {rateLimitStats?.windowLimit ?? 0}
                  </div>
                </div>
                <div className="bg-canvas p-2 rounded border border-hairline/60">
                  <div className="text-muted">Algorithm:</div>
                  <div className="font-semibold text-accent-teal">Sliding Window Lua</div>
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side Cards: MySQL vs Redis for target product */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MySQL Panel */}
            <div className="bg-canvas rounded-lg border border-hairline p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-hairline">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-accent-teal" />
                  <span className="text-xs font-semibold text-ink uppercase tracking-wider font-mono">
                    MySQL Database
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted">Primary Store</span>
              </div>

              {!isDbEmpty ? (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-hairline/40">
                    <span className="text-muted">ID:</span>
                    <span className="text-ink font-semibold">{dbProduct?.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hairline/40">
                    <span className="text-muted">Name:</span>
                    <span className="text-ink font-medium">{dbProduct?.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hairline/40">
                    <span className="text-muted">Price:</span>
                    <span
                      className={`font-semibold ${
                        isStale ? 'text-success font-bold underline' : 'text-ink'
                      }`}
                    >
                      ${dbProduct?.price}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted">Stock:</span>
                    <span className="text-ink">{dbProduct?.stock} units</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs font-mono text-muted">
                  <HelpCircle className="w-6 h-6 mx-auto mb-1 text-muted-soft" />
                  Record not found in MySQL
                </div>
              )}
            </div>

            {/* Redis Panel */}
            <div className="bg-canvas rounded-lg border border-hairline p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-hairline">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-ink uppercase tracking-wider font-mono">
                    Redis Cache
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted">Key: product:{productId}</span>
              </div>

              {isRedisNotFound ? (
                <div className="py-6 text-center text-xs font-mono text-accent-teal bg-accent-teal/5 rounded-md border border-accent-teal/20">
                  <span className="block font-bold text-sm mb-1">"NOT FOUND"</span>
                  Negative Cache Active (Protected against DB hammering)
                </div>
              ) : !isRedisEmpty && typeof redisProduct === 'object' ? (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-hairline/40">
                    <span className="text-muted">ID:</span>
                    <span className="text-ink font-semibold">{redisProduct?.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hairline/40">
                    <span className="text-muted">Name:</span>
                    <span className="text-ink font-medium">{redisProduct?.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hairline/40">
                    <span className="text-muted">Price:</span>
                    <span
                      className={`font-semibold ${
                        isStale ? 'text-error font-bold line-through' : 'text-ink'
                      }`}
                    >
                      ${redisProduct?.price}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted">Stock:</span>
                    <span className="text-ink">{redisProduct?.stock} units</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs font-mono text-muted">
                  <Server className="w-6 h-6 mx-auto mb-1 text-muted-soft" />
                  Redis Cache is empty (Next GET will trigger CACHE MISS)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL DATABASE & CACHE EXPLORER TABLE */}
      {viewMode === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Entire MySQL Database Table */}
          <div className="bg-canvas rounded-lg border border-hairline p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-accent-teal" />
                <span className="text-xs font-semibold text-ink uppercase tracking-wider font-mono">
                  MySQL Products Table ({allDbProducts.length})
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted">TABLE products</span>
            </div>

            {allDbProducts.length > 0 ? (
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="text-[11px] text-muted border-b border-hairline sticky top-0 bg-canvas">
                    <tr>
                      <th className="py-1.5 px-2">ID</th>
                      <th className="py-1.5 px-2">Name</th>
                      <th className="py-1.5 px-2 text-right">Price</th>
                      <th className="py-1.5 px-2 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline/40">
                    {allDbProducts.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => onSelectProduct?.(p.id)}
                        className={`cursor-pointer hover:bg-surface-soft/80 transition-colors ${
                          p.id === productId ? 'bg-primary/15 text-primary font-bold' : 'text-body'
                        }`}
                        title={`Click to inspect Product #${p.id}`}
                      >
                        <td className="py-1.5 px-2 font-semibold">#{p.id}</td>
                        <td className="py-1.5 px-2">{p.name}</td>
                        <td className="py-1.5 px-2 text-right">${p.price}</td>
                        <td className="py-1.5 px-2 text-right">{p.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs font-mono text-muted">
                <Database className="w-6 h-6 mx-auto mb-1 text-muted-soft" />
                No records found in MySQL. (Click "Seed Product #1" above to insert).
              </div>
            )}
          </div>

          {/* Entire Redis Cache Table */}
          <div className="bg-canvas rounded-lg border border-hairline p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-ink uppercase tracking-wider font-mono">
                  Redis Cache Entries ({allCacheItems.length})
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted">REDIS KEYS</span>
            </div>

            {allCacheItems.length > 0 ? (
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="text-[11px] text-muted border-b border-hairline sticky top-0 bg-canvas">
                    <tr>
                      <th className="py-1.5 px-2">Key</th>
                      <th className="py-1.5 px-2">Type</th>
                      <th className="py-1.5 px-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline/40">
                    {allCacheItems.map((item, idx) => {
                      const isStr = typeof item === 'string'
                      let isNF = false
                      if (isStr) {
                        try {
                          isNF = item.includes('NOT FOUND') || atob(item).includes('NOT FOUND')
                        } catch {
                          isNF = item.includes('NOT FOUND')
                        }
                      }
                      const keyLabel = !isStr && item?.id ? `product:${item.id}` : isNF ? 'product:999' : `item:${idx}`
                      const isTarget = !isStr && item?.id === productId

                      return (
                        <tr
                          key={idx}
                          onClick={() => {
                            if (!isStr && item?.id) {
                              onSelectProduct?.(item.id)
                            } else if (isNF) {
                              onSelectProduct?.(999)
                            }
                          }}
                          className={`cursor-pointer hover:bg-surface-soft/80 transition-colors ${
                            isTarget ? 'bg-primary/15 text-primary font-bold' : 'text-body'
                          }`}
                          title={!isStr && item?.id ? `Click to inspect Product #${item.id}` : isNF ? 'Click to inspect Product #999' : undefined}
                        >
                          <td className="py-1.5 px-2 font-semibold">{keyLabel}</td>
                          <td className="py-1.5 px-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                                isNF
                                  ? 'bg-accent-teal/20 text-accent-teal'
                                  : 'bg-primary/20 text-primary'
                              }`}
                            >
                              {isNF ? 'Negative' : 'Product'}
                            </span>
                          </td>
                          <td className="py-1.5 px-2">
                            {isNF
                              ? '"NOT FOUND"'
                              : !isStr && item
                              ? `${item.name} ($${item.price})`
                              : String(item)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs font-mono text-muted">
                <Server className="w-6 h-6 mx-auto mb-1 text-muted-soft" />
                Redis Cache is currently empty.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
