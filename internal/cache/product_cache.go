package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/huylhn1810/redis-practice/internal/model"
	"github.com/redis/go-redis/v9"
)

var ErrCacheMiss = errors.New("cache miss")

const notFoundValue = "NOT FOUND"

type CachedProduct struct {
	Product  *model.Product
	NotFound bool
}

type ProductCache interface {
	Get(ctx context.Context, id int) (CachedProduct, error)
	SetProduct(ctx context.Context, product model.Product, ttl time.Duration) error
	SetNotFound(ctx context.Context, id int, ttl time.Duration) error
	Delete(ctx context.Context, id int) error
}

type Admin interface {
	Inspect(ctx context.Context) ([]any, error)
	Flush(ctx context.Context) error
}

type productJSON struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Price int    `json:"price"`
	Stock int    `json:"stock"`
}

type RedisProductCache struct {
	client *redis.Client
}

func NewProductCache(client *redis.Client) *RedisProductCache {
	return &RedisProductCache{client: client}
}

func (c *RedisProductCache) Get(ctx context.Context, id int) (CachedProduct, error) {
	value, err := c.client.Get(ctx, key(id)).Bytes()
	if errors.Is(err, redis.Nil) {
		return CachedProduct{}, ErrCacheMiss
	}
	if err != nil {
		return CachedProduct{}, fmt.Errorf("redis get product %d: %w", id, err)
	}
	if string(value) == notFoundValue {
		return CachedProduct{NotFound: true}, nil
	}

	var decoded productJSON
	if err := json.Unmarshal(value, &decoded); err != nil {
		return CachedProduct{}, fmt.Errorf("decode cached product %d: %w", id, err)
	}
	return CachedProduct{Product: &model.Product{
		ID: decoded.ID, Name: decoded.Name, Price: decoded.Price, Stock: decoded.Stock,
	}}, nil
}

func (c *RedisProductCache) SetProduct(
	ctx context.Context,
	product model.Product,
	ttl time.Duration,
) error {
	value, err := json.Marshal(productJSON{
		ID: product.ID, Name: product.Name, Price: product.Price, Stock: product.Stock,
	})
	if err != nil {
		return fmt.Errorf("encode product %d for cache: %w", product.ID, err)
	}
	if err := c.client.Set(ctx, key(product.ID), value, ttl).Err(); err != nil {
		return fmt.Errorf("redis set product %d: %w", product.ID, err)
	}
	return nil
}

func (c *RedisProductCache) SetNotFound(ctx context.Context, id int, ttl time.Duration) error {
	if err := c.client.Set(ctx, key(id), notFoundValue, ttl).Err(); err != nil {
		return fmt.Errorf("redis set missing product %d: %w", id, err)
	}
	return nil
}

func (c *RedisProductCache) Delete(ctx context.Context, id int) error {
	if err := c.client.Unlink(ctx, key(id)).Err(); err != nil {
		return fmt.Errorf("redis delete product %d: %w", id, err)
	}
	return nil
}

func (c *RedisProductCache) Inspect(ctx context.Context) ([]any, error) {
	var cursor uint64
	result := make([]any, 0)
	for {
		keys, next, err := c.client.Scan(ctx, cursor, "product:*", 100).Result()
		if err != nil {
			return nil, fmt.Errorf("scan redis products: %w", err)
		}
		for _, cacheKey := range keys {
			value, err := c.client.Get(ctx, cacheKey).Bytes()
			if errors.Is(err, redis.Nil) {
				continue
			}
			if err != nil {
				return nil, fmt.Errorf("inspect redis key %q: %w", cacheKey, err)
			}
			if string(value) == notFoundValue {
				result = append(result, notFoundValue)
				continue
			}
			var decoded productJSON
			if err := json.Unmarshal(value, &decoded); err != nil {
				return nil, fmt.Errorf("decode redis key %q: %w", cacheKey, err)
			}
			result = append(result, decoded)
		}
		cursor = next
		if cursor == 0 {
			break
		}
	}
	return result, nil
}

func (c *RedisProductCache) Flush(ctx context.Context) error {
	if err := c.client.FlushDB(ctx).Err(); err != nil {
		return fmt.Errorf("flush redis database: %w", err)
	}
	return nil
}

func key(id int) string { return fmt.Sprintf("product:%d", id) }
