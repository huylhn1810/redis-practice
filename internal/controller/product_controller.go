package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/huylhn1810/redis-practice/internal/model"
	"github.com/huylhn1810/redis-practice/internal/service"
)

type ProductController struct {
	service service.ProductService
}

func NewProductController(productService service.ProductService) *ProductController {
	return &ProductController{service: productService}
}

type createProductRequest struct {
	ID    int    `json:"id" binding:"required,gt=0"`
	Name  string `json:"name" binding:"required"`
	Price int    `json:"price" binding:"gte=0"`
	Stock int    `json:"stock" binding:"gte=0"`
}

type updateProductRequest struct {
	Name  string `json:"name" binding:"required"`
	Price int    `json:"price" binding:"gte=0"`
	Stock int    `json:"stock" binding:"gte=0"`
}

type productResponse struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Price int    `json:"price"`
	Stock int    `json:"stock"`
}

func (c *ProductController) Get(ctx *gin.Context) {
	id, err := positiveID(ctx.Param("id"))
	if err != nil {
		respondError(ctx, err)
		return
	}
	product, err := c.service.GetProduct(ctx.Request.Context(), id)
	if err != nil {
		respondError(ctx, err)
		return
	}
	respond(ctx, http.StatusOK, gin.H{"product": toProductResponse(*product)})
}

func (c *ProductController) List(ctx *gin.Context) {
	products, err := c.service.GetAllProducts(ctx.Request.Context())
	if err != nil {
		respondError(ctx, err)
		return
	}

	response := make([]productResponse, 0, len(products))
	for _, product := range products {
		response = append(response, toProductResponse(product))
	}
	respond(ctx, http.StatusOK, gin.H{"products": response})
}

func (c *ProductController) Create(ctx *gin.Context) {
	var request createProductRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		respondError(ctx, service.ErrInvalidInput)
		return
	}

	err := c.service.CreateProduct(ctx.Request.Context(), model.Product{
		ID: request.ID, Name: request.Name, Price: request.Price, Stock: request.Stock,
	})
	if err != nil {
		respondError(ctx, err)
		return
	}
	respond(ctx, http.StatusOK, nil)
}

func (c *ProductController) Update(ctx *gin.Context) {
	id, err := positiveID(ctx.Param("id"))
	if err != nil {
		respondError(ctx, err)
		return
	}

	var request updateProductRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		respondError(ctx, service.ErrInvalidInput)
		return
	}
	err = c.service.UpdateProduct(ctx.Request.Context(), model.Product{
		ID: id, Name: request.Name, Price: request.Price, Stock: request.Stock,
	})
	if err != nil {
		respondError(ctx, err)
		return
	}
	respond(ctx, http.StatusOK, nil)
}

func (c *ProductController) Delete(ctx *gin.Context) {
	id, err := positiveID(ctx.Param("id"))
	if err != nil {
		respondError(ctx, err)
		return
	}
	if err := c.service.DeleteProduct(ctx.Request.Context(), id); err != nil {
		respondError(ctx, err)
		return
	}
	respond(ctx, http.StatusOK, nil)
}

func (c *ProductController) Clear(ctx *gin.Context) {
	if err := c.service.ClearData(ctx.Request.Context()); err != nil {
		respondError(ctx, err)
		return
	}
	respond(ctx, http.StatusOK, nil)
}

func (c *ProductController) RunStampede(ctx *gin.Context) {
	const count = 100
	requestContext := ctx.Request.Context()
	start := make(chan struct{})
	var waitGroup sync.WaitGroup

	for range count {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			<-start
			_, _ = c.service.GetProduct(requestContext, 1)
		}()
	}
	close(start)
	waitGroup.Wait()
	respond(ctx, http.StatusOK, gin.H{
		"message": fmt.Sprintf("Stampede completed with %d concurrent goroutines", count),
	})
}

func positiveID(raw string) (int, error) {
	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		return 0, service.ErrInvalidInput
	}
	return id, nil
}

func toProductResponse(product model.Product) productResponse {
	return productResponse{
		ID: product.ID, Name: product.Name, Price: product.Price, Stock: product.Stock,
	}
}
