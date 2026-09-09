package controller

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type EventStream interface {
	Subscribe() (<-chan string, func())
}

type SSEController struct {
	events EventStream
}

func NewSSEController(events EventStream) *SSEController {
	return &SSEController{events: events}
}

func (c *SSEController) Stream(ctx *gin.Context) {
	ctx.Header("Content-Type", "text/event-stream")
	ctx.Header("Cache-Control", "no-cache")
	ctx.Header("Connection", "keep-alive")
	ctx.Status(http.StatusOK)

	messages, unsubscribe := c.events.Subscribe()
	defer unsubscribe()
	_, _ = fmt.Fprint(ctx.Writer, "data: Connection is created\n\n")
	ctx.Writer.Flush()

	heartbeat := time.NewTicker(15 * time.Second)
	defer heartbeat.Stop()
	for {
		select {
		case <-ctx.Request.Context().Done():
			return
		case message, ok := <-messages:
			if !ok {
				return
			}
			_, _ = fmt.Fprintf(ctx.Writer, "data: %s\n\n", message)
			ctx.Writer.Flush()
		case <-heartbeat.C:
			_, _ = fmt.Fprint(ctx.Writer, ": ping\n\n")
			ctx.Writer.Flush()
		}
	}
}
