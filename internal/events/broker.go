package events

import "sync"

type Broker struct {
	mu          sync.RWMutex
	nextID      uint64
	subscribers map[uint64]chan string
}

func NewBroker() *Broker {
	return &Broker{subscribers: make(map[uint64]chan string)}
}

func (b *Broker) Publish(message string) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for _, subscriber := range b.subscribers {
		select {
		case subscriber <- message:
		default:
		}
	}
}

func (b *Broker) Subscribe() (<-chan string, func()) {
	b.mu.Lock()
	id := b.nextID
	b.nextID++
	channel := make(chan string, 64)
	b.subscribers[id] = channel
	b.mu.Unlock()

	var once sync.Once
	unsubscribe := func() {
		once.Do(func() {
			b.mu.Lock()
			delete(b.subscribers, id)
			close(channel)
			b.mu.Unlock()
		})
	}
	return channel, unsubscribe
}
