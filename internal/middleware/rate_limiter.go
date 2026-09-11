package middleware

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/huylhn1810/redis-practice/internal/cache"
)

type RateLimiter interface {
	Allow(ctx context.Context, clientID string) (cache.RateLimitDecision, error)
}

const (
	DemoClientIDHeader = "X-Demo-Client-ID"
	decisionContextKey = "rateLimitDecision"
)

type RateLimitMiddleware struct {
	rateLimiter RateLimiter
}

func NewRateLimitMiddleware(rateLimiter RateLimiter) *RateLimitMiddleware {
	return &RateLimitMiddleware{rateLimiter: rateLimiter}
}

func (m *RateLimitMiddleware) Handle(ctx *gin.Context) {
	clientID := strings.TrimSpace(ctx.GetHeader(DemoClientIDHeader))
	if clientID == "" {
		clientID = ctx.ClientIP()
	}

	decision, err := m.rateLimiter.Allow(ctx.Request.Context(), clientID)
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"data": gin.H{
			"message": "rate limiter unavailable",
		}})
		return
	}

	setRateLimitHeaders(ctx, decision)
	ctx.Set(decisionContextKey, decision)
	if !decision.Allowed {
		ctx.Header("Retry-After", strconv.Itoa(decision.RetryAfterSeconds))
		ctx.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"data": gin.H{
			"message":    "too many requests",
			"rate_limit": decision,
		}})
		return
	}

	ctx.Next()
}

func DecisionFromContext(ctx *gin.Context) (cache.RateLimitDecision, bool) {
	value, exists := ctx.Get(decisionContextKey)
	if !exists {
		return cache.RateLimitDecision{}, false
	}
	decision, ok := value.(cache.RateLimitDecision)
	return decision, ok
}

func setRateLimitHeaders(ctx *gin.Context, decision cache.RateLimitDecision) {
	ctx.Header("X-RateLimit-Limit", strconv.Itoa(decision.Limit))
	ctx.Header("X-RateLimit-Remaining", strconv.Itoa(decision.Remaining))
	ctx.Header("X-RateLimit-Reset-After", strconv.Itoa(decision.ResetAfterSeconds))
}
