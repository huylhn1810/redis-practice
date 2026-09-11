package cache

import (
	"context"
	"crypto/sha256"
	_ "embed"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

//go:embed scripts/sliding_window.lua
var slidingWindowLua string

type RateLimitDecision struct {
	Allowed           bool `json:"allowed"`
	Limit             int  `json:"limit"`
	Used              int  `json:"used"`
	Remaining         int  `json:"remaining"`
	WindowSeconds     int  `json:"window_seconds"`
	ResetAfterSeconds int  `json:"reset_after_seconds"`
	RetryAfterSeconds int  `json:"retry_after_seconds"`
}

type RedisRateLimiter struct {
	client        *redis.Client
	maxRequests   int
	windowSeconds int64
	script        *redis.Script
}

func NewRedisRateLimiter(
	client *redis.Client,
	maxRequests int,
	window time.Duration,
) (*RedisRateLimiter, error) {
	if client == nil {
		return nil, errors.New("redis client is required")
	}
	if maxRequests <= 0 {
		return nil, errors.New("max requests must be greater than zero")
	}
	windowSeconds := int64(window / time.Second)
	if windowSeconds <= 0 {
		return nil, errors.New("rate limit window must be at least one second")
	}
	return &RedisRateLimiter{
		client:        client,
		maxRequests:   maxRequests,
		windowSeconds: windowSeconds,
		script:        redis.NewScript(slidingWindowLua),
	}, nil
}

func (r *RedisRateLimiter) Allow(
	ctx context.Context,
	clientID string,
) (RateLimitDecision, error) {
	now := time.Now().Unix()
	currentWindow := now / r.windowSeconds
	previousWindow := currentWindow - 1
	elapsedSeconds := now % r.windowSeconds

	// Hashing keeps arbitrary client input out of Redis keys. The braces are a
	// Redis Cluster hash tag, so both Lua keys always belong to the same slot.
	identity := clientHash(clientID)
	currentKey := fmt.Sprintf("rate_limit:{%s}:%d", identity, currentWindow)
	previousKey := fmt.Sprintf("rate_limit:{%s}:%d", identity, previousWindow)

	values, err := r.script.Run(
		ctx,
		r.client,
		[]string{currentKey, previousKey},
		r.maxRequests,
		r.windowSeconds,
		elapsedSeconds,
	).Slice()
	if err != nil {
		return RateLimitDecision{}, fmt.Errorf("execute rate limit script: %w", err)
	}
	if len(values) != 5 {
		return RateLimitDecision{}, fmt.Errorf("unexpected rate limit result length: %d", len(values))
	}

	allowed, err := resultInt(values[0])
	if err != nil {
		return RateLimitDecision{}, err
	}
	used, err := resultInt(values[1])
	if err != nil {
		return RateLimitDecision{}, err
	}
	remaining, err := resultInt(values[2])
	if err != nil {
		return RateLimitDecision{}, err
	}
	resetAfter, err := resultInt(values[3])
	if err != nil {
		return RateLimitDecision{}, err
	}
	retryAfter, err := resultInt(values[4])
	if err != nil {
		return RateLimitDecision{}, err
	}

	return RateLimitDecision{
		Allowed:           allowed == 1,
		Limit:             r.maxRequests,
		Used:              int(used),
		Remaining:         int(remaining),
		WindowSeconds:     int(r.windowSeconds),
		ResetAfterSeconds: int(resetAfter),
		RetryAfterSeconds: int(retryAfter),
	}, nil
}

func clientHash(clientID string) string {
	sum := sha256.Sum256([]byte(clientID))
	return hex.EncodeToString(sum[:8])
}

func resultInt(value any) (int64, error) {
	result, ok := value.(int64)
	if !ok {
		return 0, fmt.Errorf("unexpected rate limit result type %T", value)
	}
	return result, nil
}
