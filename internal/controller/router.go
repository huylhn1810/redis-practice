package controller

import "github.com/gin-gonic/gin"

func NewRouter(
	products *ProductController,
	cache *CacheController,
	demo *DemoController,
	events *SSEController,
) *gin.Engine {
	router := gin.Default()
	api := router.Group("/api/v1")

	api.POST("/demo/scenario", demo.SelectScenario)
	api.POST("/demo/reset", demo.Reset)
	api.GET("/demo/metrics", demo.GetMetrics)
	api.GET("/demo/config", demo.GetConfig)
	api.GET("/demo/events", events.Stream)
	api.POST("/demo/stampede", products.RunStampede)

	api.POST("/products", products.Create)
	api.GET("/products/:id", products.Get)
	api.GET("/products", products.List)
	api.PUT("/products/:id", products.Update)
	api.DELETE("/products/:id", products.Delete)
	api.DELETE("/products", products.Clear)

	api.GET("/cache", cache.Inspect)
	api.DELETE("/cache", cache.Flush)
	return router
}
