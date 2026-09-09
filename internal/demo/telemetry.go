package demo

import (
	"sync/atomic"

	"github.com/huylhn1810/redis-practice/internal/service"
)

type EventPublisher interface {
	Publish(message string)
}

type MetricsSnapshot struct {
	CacheHits   int64
	CacheMisses int64
	DBQueries   int64
	RedisErrors int64
}

type Telemetry struct {
	publisher   EventPublisher
	cacheHits   atomic.Int64
	cacheMisses atomic.Int64
	dbQueries   atomic.Int64
	redisErrors atomic.Int64
}

func NewTelemetry(publisher EventPublisher) *Telemetry {
	return &Telemetry{publisher: publisher}
}

var _ service.Observer = (*Telemetry)(nil)

func (t *Telemetry) Record(event service.Event) {
	switch event {
	case service.EventCacheHit:
		t.cacheHits.Add(1)
	case service.EventCacheMiss:
		t.cacheMisses.Add(1)
	case service.EventDatabaseQuery:
		t.dbQueries.Add(1)
	case service.EventCacheError:
		t.redisErrors.Add(1)
	}
	if t.publisher != nil {
		t.publisher.Publish(string(event))
	}
}

func (t *Telemetry) Snapshot() MetricsSnapshot {
	return MetricsSnapshot{
		CacheHits:   t.cacheHits.Load(),
		CacheMisses: t.cacheMisses.Load(),
		DBQueries:   t.dbQueries.Load(),
		RedisErrors: t.redisErrors.Load(),
	}
}

func (t *Telemetry) CacheHits() int64   { return t.cacheHits.Load() }
func (t *Telemetry) CacheMisses() int64 { return t.cacheMisses.Load() }
func (t *Telemetry) DBQueries() int64   { return t.dbQueries.Load() }
func (t *Telemetry) RedisErrors() int64 { return t.redisErrors.Load() }

func (t *Telemetry) Reset() {
	t.cacheHits.Store(0)
	t.cacheMisses.Store(0)
	t.dbQueries.Store(0)
	t.redisErrors.Store(0)
}
