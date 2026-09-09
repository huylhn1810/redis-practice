package controller

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/huylhn1810/redis-practice/internal/service"
)

func respond(ctx *gin.Context, status int, data gin.H) {
	if data == nil {
		data = gin.H{}
	}
	if _, ok := data["message"]; !ok {
		data["message"] = "success"
	}
	ctx.JSON(status, gin.H{"data": data})
}

func respondError(ctx *gin.Context, err error) {
	status := http.StatusInternalServerError
	message := "internal server error"
	switch {
	case errors.Is(err, service.ErrInvalidInput):
		status = http.StatusBadRequest
		message = service.ErrInvalidInput.Error()
	case errors.Is(err, service.ErrProductNotFound):
		status = http.StatusNotFound
		message = service.ErrProductNotFound.Error()
	case errors.Is(err, service.ErrProductExists):
		status = http.StatusConflict
		message = service.ErrProductExists.Error()
	}
	respond(ctx, status, gin.H{"message": message})
}
