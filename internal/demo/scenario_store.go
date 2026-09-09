package demo

import (
	"fmt"
	"sync"
	"time"

	"github.com/huylhn1810/redis-practice/internal/service"
)

const DefaultScenario = "stale-before"

var scenarios = map[string]service.CachePolicy{
	"stale-before": {},
	"stale-after": {
		InvalidateOnUpdate: true,
	},
	"ttl-before": {},
	"ttl-after": {
		TTL: 30 * time.Second,
	},
	"negative-before": {},
	"negative-after": {
		NegativeCaching:  true,
		NegativeCacheTTL: 10 * time.Second,
	},
	"stampede-before": {
		TTL: 10 * time.Second,
	},
	"stampede-after": {
		TTL:                10 * time.Second,
		StampedeProtection: true,
	},
}

type ScenarioStore struct {
	mu      sync.RWMutex
	name    string
	current service.CachePolicy
}

func NewScenarioStore() *ScenarioStore {
	store := &ScenarioStore{}
	store.Reset()
	return store
}

var _ service.PolicyProvider = (*ScenarioStore)(nil)

func (s *ScenarioStore) Current() service.CachePolicy {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.current
}

func (s *ScenarioStore) Name() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.name
}

func (s *ScenarioStore) Select(name string) error {
	policy, ok := scenarios[name]
	if !ok {
		return fmt.Errorf("unknown scenario %q", name)
	}
	s.mu.Lock()
	s.name = name
	s.current = policy
	s.mu.Unlock()
	return nil
}

func (s *ScenarioStore) Reset() {
	s.mu.Lock()
	s.name = DefaultScenario
	s.current = scenarios[DefaultScenario]
	s.mu.Unlock()
}
