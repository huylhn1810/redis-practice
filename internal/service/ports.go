package service

import "time"

type CachePolicy struct {
	TTL                time.Duration
	InvalidateOnUpdate bool
	NegativeCaching    bool
	NegativeCacheTTL   time.Duration
	StampedeProtection bool
}

type PolicyProvider interface {
	Current() CachePolicy
}

type Event string

const (
	EventCacheHit      Event = "CACHE HIT"
	EventCacheMiss     Event = "CACHE MISS"
	EventCacheSet      Event = "CACHE SET"
	EventCacheDelete   Event = "CACHE DELETE"
	EventCacheError    Event = "CACHE ERROR"
	EventDatabaseQuery Event = "DATABASE QUERY"
	EventClearDatabase Event = "CLEAR DATA MYSQL"
	EventClearCache    Event = "CLEAR DATA REDIS"
)

type Observer interface {
	Record(event Event)
}

type RequestCoalescer interface {
	Do(key string, fn func() (any, error)) (any, error)
}
