import React from 'react'
import { ScenarioId, ScenarioMode } from '../types'
import { BookOpen, CheckCircle, AlertCircle } from 'lucide-react'

interface ComparisonGuideProps {
  scenario: ScenarioId
  mode: ScenarioMode
}

interface GuideContent {
  title: string
  problemTitle: string
  problemDesc: string
  problemSteps: string[]
  solutionTitle: string
  solutionDesc: string
  solutionSteps: string[]
}

const GUIDES: Record<ScenarioId, GuideContent> = {
  'cache-aside': {
    title: 'Cache Aside Pattern',
    problemTitle: 'Cold Cache (First Request)',
    problemDesc: 'When data is requested for the first time, it does not exist in Redis.',
    problemSteps: [
      '1. Request hits Redis -> CACHE MISS',
      '2. Application queries MySQL -> DB QUERY (Slow)',
      '3. Application writes result to Redis -> CACHE SET',
    ],
    solutionTitle: 'Warm Cache (Subsequent Requests)',
    solutionDesc: 'Once cached, subsequent queries are served in sub-millisecond time without touching MySQL.',
    solutionSteps: [
      '1. Request hits Redis -> CACHE HIT',
      '2. Returned immediately to client',
      '3. DB Query counter DOES NOT increase',
    ],
  },
  'stale-cache': {
    title: 'Stale Cache & Invalidation',
    problemTitle: 'BEFORE: No Invalidation on Update',
    problemDesc: 'Updating a record in the database without clearing or updating the cache leads to stale data served to users.',
    problemSteps: [
      '1. GET Product #1: Redis & DB both have $100',
      '2. Update Price to $200: MySQL is updated to $200, but Redis still holds $100',
      '3. GET Product #1 Again: Client receives $100 from Redis (⚠ STALE DATA)',
    ],
    solutionTitle: 'AFTER: Invalidate Cache on Update',
    solutionDesc: 'When an update succeeds in MySQL, the application immediately deletes (invalidates) the Redis cache key.',
    solutionSteps: [
      '1. Update Price to $200: MySQL updated -> Redis key product:1 is DELETED',
      '2. Next GET Product: CACHE MISS triggers a fresh DB query',
      '3. Client receives fresh $200 from DB and Redis is repopulated (✓ CONSISTENT)',
    ],
  },
  ttl: {
    title: 'TTL (Time To Live)',
    problemTitle: 'BEFORE: Keys Never Expire (TTL: 0)',
    problemDesc: 'Without a TTL, orphaned or rarely used data remains in memory forever, risking memory exhaustion (OOM).',
    problemSteps: [
      '1. Key is written to Redis with no expiry',
      '2. Key persists indefinitely',
      '3. Old values remain cached forever unless manually flushed',
    ],
    solutionTitle: 'AFTER: TTL Set (e.g. 30 seconds)',
    solutionDesc: 'Keys automatically expire after their TTL duration. Redis frees memory and forces periodic refresh.',
    solutionSteps: [
      '1. Key is written to Redis with EX 30s',
      '2. Reads within 30s return CACHE HIT',
      '3. After 30s, key expires automatically -> Next read triggers CACHE MISS & fresh reload',
    ],
  },
  'negative-caching': {
    title: 'Negative Caching (Missing Keys)',
    problemTitle: 'BEFORE: Penetration on Missing Keys',
    problemDesc: 'Attackers or crawlers querying non-existent IDs bypass cache completely and hammer the database.',
    problemSteps: [
      '1. 10 queries sent for non-existent Product #999',
      '2. Redis misses 10 times',
      '3. MySQL executes 10 SELECT queries that all return empty (Database exhaustion)',
    ],
    solutionTitle: 'AFTER: Cache "NOT FOUND" with Short TTL',
    solutionDesc: 'When MySQL returns "Record Not Found", cache the empty result for a short period (10s).',
    solutionSteps: [
      '1. Query 1: Redis misses -> DB query returns 404 -> Cache "NOT FOUND" (TTL 10s)',
      '2. Queries 2..10: Return CACHE HIT directly from Redis',
      '3. MySQL is protected: DB queries count = 1 instead of 10! (✓ PROTECTED)',
    ],
  },
  'cache-stampede': {
    title: 'Cache Stampede (Thundering Herd)',
    problemTitle: 'BEFORE: Stampede on Expiration',
    problemDesc: 'When a popular key expires, hundreds of concurrent requests all miss cache simultaneously and flood MySQL.',
    problemSteps: [
      '1. Key expires or is flushed',
      '2. 50-100 concurrent HTTP requests arrive simultaneously',
      '3. All 50-100 requests miss cache and query MySQL at the exact same moment (⚠ DB OVERLOAD)',
    ],
    solutionTitle: 'AFTER: SingleFlight Deduplication',
    solutionDesc: 'SingleFlight suppresses duplicate concurrent in-flight requests, ensuring only ONE query reaches MySQL.',
    solutionSteps: [
      '1. 50-100 concurrent requests arrive simultaneously',
      '2. SingleFlight allows only 1 request to query MySQL',
      '3. The other 99 requests wait for the first result and share it (DB Queries = ~1!) (✓ PROTECTED)',
    ],
  },
  'rate-limit': {
    title: 'Rate Limiting (Redis Sliding Window)',
    problemTitle: 'BEFORE: Unprotected API & Denial of Service',
    problemDesc:
      'Without rate limiting, aggressive clients, bots, or accidental infinite loops can spam the API with hundreds of requests, overwhelming MySQL and the application server.',
    problemSteps: [
      '1. Client spams unlimited requests to /api/v1/products',
      '2. Every request passes through to query DB or cache without restriction',
      '3. Server CPU maxes out and connection pools starve, causing downtime (⚠ DoS Vulnerability)',
    ],
    solutionTitle: 'AFTER: Sliding Window Counter via Redis Lua',
    solutionDesc:
      'Redis tracks requests per simulated client (X-Demo-Client-ID) using an atomic Lua script with a weighted sliding window formula: estimated = prev * (1 - ratio) + current.',
    solutionSteps: [
      '1. Requests within the configured quota are allowed (HTTP 200 OK)',
      '2. A request over the estimated quota is blocked (HTTP 429 Too Many Requests)',
      '3. Client Isolation: Client B is unaffected even when Client A is throttled! (✓ ISOLATED & PROTECTED)',
    ],
  },
}

export const ComparisonGuide: React.FC<ComparisonGuideProps> = ({
  scenario,
  mode,
}) => {
  const guide = GUIDES[scenario]

  return (
    <div className="bg-surface-card rounded-lg border border-hairline p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-mono">
          Learning Guide: {guide.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Problem Card */}
        <div
          className={`rounded-lg border p-4 transition-all ${
            scenario === 'rate-limit' || scenario === 'cache-aside' || mode === 'before'
              ? 'bg-canvas border-accent-amber/50 shadow-sm ring-1 ring-accent-amber/20'
              : 'bg-canvas/60 border-hairline/60 opacity-80'
          }`}
        >
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-accent-amber font-mono">
            <AlertCircle className="w-4 h-4" />
            <span>{guide.problemTitle}</span>
          </div>
          <p className="text-xs text-body mb-3">{guide.problemDesc}</p>
          <div className="space-y-1 text-xs font-mono bg-surface-soft p-2.5 rounded border border-hairline/60">
            {guide.problemSteps.map((step, idx) => (
              <div key={idx} className="text-body text-[11px]">
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Solution Card */}
        <div
          className={`rounded-lg border p-4 transition-all ${
            scenario === 'rate-limit' || scenario === 'cache-aside' || mode === 'after'
              ? 'bg-canvas border-success/50 shadow-sm ring-1 ring-success/20'
              : 'bg-canvas/60 border-hairline/60 opacity-80'
          }`}
        >
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-success font-mono">
            <CheckCircle className="w-4 h-4" />
            <span>{guide.solutionTitle}</span>
          </div>
          <p className="text-xs text-body mb-3">{guide.solutionDesc}</p>
          <div className="space-y-1 text-xs font-mono bg-surface-soft p-2.5 rounded border border-hairline/60">
            {guide.solutionSteps.map((step, idx) => (
              <div key={idx} className="text-body text-[11px]">
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
