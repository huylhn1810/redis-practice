package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/huylhn1810/redis-practice/internal/cache"
	"github.com/huylhn1810/redis-practice/internal/model"
	"github.com/huylhn1810/redis-practice/internal/repository"
)

var (
	ErrProductNotFound = errors.New("product not found")
	ErrProductExists   = errors.New("product already exists")
	ErrInvalidInput    = errors.New("invalid product input")
)

type ProductService interface {
	ClearData(ctx context.Context) error
	GetAllProducts(ctx context.Context) ([]model.Product, error)
	GetProduct(ctx context.Context, id int) (*model.Product, error)
	CreateProduct(ctx context.Context, product model.Product) error
	UpdateProduct(ctx context.Context, product model.Product) error
	DeleteProduct(ctx context.Context, id int) error
}

type productService struct {
	repository repository.ProductRepository
	cache      cache.ProductCache
	policies   PolicyProvider
	coalescer  RequestCoalescer
	observer   Observer
}

func NewProductService(
	repository repository.ProductRepository,
	cache cache.ProductCache,
	policies PolicyProvider,
	coalescer RequestCoalescer,
	observer Observer,
) ProductService {
	return &productService{
		repository: repository,
		cache:      cache,
		policies:   policies,
		coalescer:  coalescer,
		observer:   observer,
	}
}

func (s *productService) ClearData(ctx context.Context) error {
	s.observer.Record(EventClearDatabase)
	return s.repository.Clear(ctx)
}

func (s *productService) GetAllProducts(ctx context.Context) ([]model.Product, error) {
	return s.repository.List(ctx)
}

func (s *productService) GetProduct(ctx context.Context, id int) (*model.Product, error) {
	if id <= 0 {
		return nil, ErrInvalidInput
	}

	entry, err := s.cache.Get(ctx, id)
	if err == nil {
		s.observer.Record(EventCacheHit)
		if entry.NotFound {
			return nil, ErrProductNotFound
		}
		if entry.Product != nil {
			return entry.Product, nil
		}
		err = cache.ErrCacheMiss
	}

	s.observer.Record(EventCacheMiss)
	if !errors.Is(err, cache.ErrCacheMiss) {
		s.observer.Record(EventCacheError)
	}

	policy := s.policies.Current()
	load := func() (any, error) { return s.loadFromDatabase(ctx, id, policy) }
	if !policy.StampedeProtection {
		value, loadErr := load()
		return productResult(value, loadErr)
	}

	value, loadErr := s.coalescer.Do(fmt.Sprintf("product:%d", id), func() (any, error) {
		entry, cacheErr := s.cache.Get(ctx, id)
		if cacheErr == nil {
			if entry.NotFound {
				return nil, ErrProductNotFound
			}
			if entry.Product != nil {
				return entry.Product, nil
			}
		}
		return load()
	})
	return productResult(value, loadErr)
}

func (s *productService) loadFromDatabase(
	ctx context.Context,
	id int,
	policy CachePolicy,
) (any, error) {
	s.observer.Record(EventDatabaseQuery)
	product, err := s.repository.GetByID(ctx, id)
	if errors.Is(err, repository.ErrProductNotFound) {
		if policy.NegativeCaching {
			if cacheErr := s.cache.SetNotFound(ctx, id, policy.NegativeCacheTTL); cacheErr != nil {
				s.observer.Record(EventCacheError)
			} else {
				s.observer.Record(EventCacheSet)
			}
		}
		return nil, ErrProductNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get product from repository: %w", err)
	}

	if err := s.cache.SetProduct(ctx, *product, policy.TTL); err != nil {
		s.observer.Record(EventCacheError)
	} else {
		s.observer.Record(EventCacheSet)
	}
	return product, nil
}

func (s *productService) CreateProduct(ctx context.Context, product model.Product) error {
	if err := validateProduct(product); err != nil {
		return err
	}
	if err := s.repository.Create(ctx, product); err != nil {
		return mapRepositoryError(err)
	}

	// Remove a possible negative-cache entry for this newly created ID.
	s.deleteCache(ctx, product.ID)
	return nil
}

func (s *productService) UpdateProduct(ctx context.Context, product model.Product) error {
	if err := validateProduct(product); err != nil {
		return err
	}
	if err := s.repository.Update(ctx, product); err != nil {
		return mapRepositoryError(err)
	}
	if s.policies.Current().InvalidateOnUpdate {
		s.deleteCache(ctx, product.ID)
	}
	return nil
}

func (s *productService) DeleteProduct(ctx context.Context, id int) error {
	if id <= 0 {
		return ErrInvalidInput
	}
	if err := s.repository.Delete(ctx, id); err != nil {
		return mapRepositoryError(err)
	}
	s.deleteCache(ctx, id)
	return nil
}

func (s *productService) deleteCache(ctx context.Context, id int) {
	if err := s.cache.Delete(ctx, id); err != nil {
		s.observer.Record(EventCacheError)
		return
	}
	s.observer.Record(EventCacheDelete)
}

func validateProduct(product model.Product) error {
	if product.ID <= 0 || strings.TrimSpace(product.Name) == "" || product.Price < 0 || product.Stock < 0 {
		return ErrInvalidInput
	}
	return nil
}

func mapRepositoryError(err error) error {
	switch {
	case errors.Is(err, repository.ErrProductNotFound):
		return ErrProductNotFound
	case errors.Is(err, repository.ErrProductExists):
		return ErrProductExists
	default:
		return err
	}
}

func productResult(value any, err error) (*model.Product, error) {
	if err != nil {
		return nil, err
	}
	product, ok := value.(*model.Product)
	if !ok {
		return nil, fmt.Errorf("unexpected product result type %T", value)
	}
	return product, nil
}
