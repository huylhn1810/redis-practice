package concurrency

import "sync"

type call struct {
	done  sync.WaitGroup
	value any
	err   error
}

type SingleFlight struct {
	mu    sync.Mutex
	calls map[string]*call
}

func NewSingleFlight() *SingleFlight {
	return &SingleFlight{calls: make(map[string]*call)}
}

func (s *SingleFlight) Do(key string, fn func() (any, error)) (any, error) {
	s.mu.Lock()
	if existing, ok := s.calls[key]; ok {
		s.mu.Unlock()
		existing.done.Wait()
		return existing.value, existing.err
	}

	current := &call{}
	current.done.Add(1)
	s.calls[key] = current
	s.mu.Unlock()

	func() {
		defer func() {
			current.done.Done()
			s.mu.Lock()
			delete(s.calls, key)
			s.mu.Unlock()
		}()
		current.value, current.err = fn()
	}()

	return current.value, current.err
}
