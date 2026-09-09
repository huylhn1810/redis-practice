package demo

import (
	"context"
	"time"

	"github.com/huylhn1810/redis-practice/internal/model"
	"github.com/huylhn1810/redis-practice/internal/repository"
)

type SlowRepository struct {
	next  repository.ProductRepository
	delay time.Duration
}

func NewSlowRepository(next repository.ProductRepository, delay time.Duration) *SlowRepository {
	return &SlowRepository{next: next, delay: delay}
}

var _ repository.ProductRepository = (*SlowRepository)(nil)

func (r *SlowRepository) Clear(ctx context.Context) error {
	return r.next.Clear(ctx)
}

func (r *SlowRepository) List(ctx context.Context) ([]model.Product, error) {
	return r.next.List(ctx)
}

func (r *SlowRepository) GetByID(ctx context.Context, id int) (*model.Product, error) {
	timer := time.NewTimer(r.delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-timer.C:
		return r.next.GetByID(ctx, id)
	}
}

func (r *SlowRepository) Create(ctx context.Context, value model.Product) error {
	return r.next.Create(ctx, value)
}

func (r *SlowRepository) Update(ctx context.Context, value model.Product) error {
	return r.next.Update(ctx, value)
}

func (r *SlowRepository) Delete(ctx context.Context, id int) error {
	return r.next.Delete(ctx, id)
}
