package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/huylhn1810/redis-practice/internal/cache"
	"github.com/huylhn1810/redis-practice/internal/service"
)

type CacheController struct {
	cache    cache.Admin
	observer service.Observer
}

func NewCacheController(cacheAdmin cache.Admin, observer service.Observer) *CacheController {
	return &CacheController{cache: cacheAdmin, observer: observer}
}

func (c *CacheController) Inspect(ctx *gin.Context) {
	values, err := c.cache.Inspect(ctx.Request.Context())
	if err != nil {
		respondError(ctx, err)
		return
	}
	respond(ctx, http.StatusOK, gin.H{"db": values})
}

func (c *CacheController) Flush(ctx *gin.Context) {
	if err := c.cache.Flush(ctx.Request.Context()); err != nil {
		respondError(ctx, err)
		return
	}
	c.observer.Record(service.EventClearCache)
	respond(ctx, http.StatusOK, nil)
}
