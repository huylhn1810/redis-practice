package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/huylhn1810/redis-practice/internal/service"
)

type ScenarioManager interface {
	Select(name string) error
	Reset()
	Current() service.CachePolicy
}

type Metrics interface {
	CacheHits() int64
	CacheMisses() int64
	DBQueries() int64
	RedisErrors() int64
	Reset()
}

type DemoController struct {
	scenarios ScenarioManager
	metrics   Metrics
}

func NewDemoController(scenarios ScenarioManager, metrics Metrics) *DemoController {
	return &DemoController{scenarios: scenarios, metrics: metrics}
}

type scenarioRequest struct {
	Scenario string `json:"scenario" binding:"required"`
}

func (c *DemoController) SelectScenario(ctx *gin.Context) {
	var request scenarioRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		respondError(ctx, service.ErrInvalidInput)
		return
	}
	if err := c.scenarios.Select(request.Scenario); err != nil {
		respondError(ctx, service.ErrInvalidInput)
		return
	}
	respond(ctx, http.StatusOK, nil)
}

func (c *DemoController) Reset(ctx *gin.Context) {
	c.scenarios.Reset()
	c.metrics.Reset()
	respond(ctx, http.StatusOK, nil)
}

func (c *DemoController) GetMetrics(ctx *gin.Context) {
	respond(ctx, http.StatusOK, gin.H{"metrics": gin.H{
		"cache_hit":   c.metrics.CacheHits(),
		"cache_miss":  c.metrics.CacheMisses(),
		"db_query":    c.metrics.DBQueries(),
		"redis_error": c.metrics.RedisErrors(),
	}})
}

func (c *DemoController) GetConfig(ctx *gin.Context) {
	policy := c.scenarios.Current()
	respond(ctx, http.StatusOK, gin.H{"config": gin.H{
		"cache_ttl":           policy.TTL,
		"negative_cache_ttl":  policy.NegativeCacheTTL,
		"negative_cache":      policy.NegativeCaching,
		"invalidation_update": policy.InvalidateOnUpdate,
		"stampede_protection": policy.StampedeProtection,
	}})
}
