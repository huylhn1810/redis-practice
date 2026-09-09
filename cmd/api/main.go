package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/huylhn1810/redis-practice/config"
	"github.com/huylhn1810/redis-practice/internal/cache"
	appconcurrency "github.com/huylhn1810/redis-practice/internal/concurrency"
	"github.com/huylhn1810/redis-practice/internal/controller"
	"github.com/huylhn1810/redis-practice/internal/demo"
	"github.com/huylhn1810/redis-practice/internal/events"
	"github.com/huylhn1810/redis-practice/internal/repository"
	"github.com/huylhn1810/redis-practice/internal/service"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load configuration: %w", err)
	}

	startupContext, cancelStartup := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelStartup()

	database, closeDatabase, err := openDatabase(startupContext, cfg.Database)
	if err != nil {
		return err
	}
	defer closeDatabase()

	redisClient, err := openRedis(startupContext, cfg.Redis)
	if err != nil {
		return err
	}
	defer redisClient.Close()

	eventBroker := events.NewBroker()
	telemetry := demo.NewTelemetry(eventBroker)
	scenarios := demo.NewScenarioStore()

	mysqlRepository := repository.NewProductRepository(database)
	slowRepository := demo.NewSlowRepository(mysqlRepository, 300*time.Millisecond)
	productCache := cache.NewProductCache(redisClient)
	coalescer := appconcurrency.NewSingleFlight()
	productService := service.NewProductService(slowRepository, productCache, scenarios, coalescer, telemetry)

	productController := controller.NewProductController(productService)
	cacheController := controller.NewCacheController(productCache, telemetry)
	demoController := controller.NewDemoController(scenarios, telemetry)
	sseController := controller.NewSSEController(eventBroker)
	router := controller.NewRouter(productController, cacheController, demoController, sseController)

	server := &http.Server{
		Addr:              ":" + cfg.Server.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	shutdownContext, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	serverErrors := make(chan error, 1)
	go func() {
		log.Printf("backend listening on %s", server.Addr)
		serverErrors <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("serve HTTP: %w", err)
	case <-shutdownContext.Done():
		gracefulContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(gracefulContext); err != nil {
			return fmt.Errorf("shutdown HTTP server: %w", err)
		}
		return nil
	}
}

func openDatabase(ctx context.Context, cfg config.Database) (*gorm.DB, func(), error) {
	database, err := gorm.Open(mysql.Open(cfg.DSN()), &gorm.Config{})
	if err != nil {
		return nil, nil, fmt.Errorf("open MySQL: %w", err)
	}
	sqlDatabase, err := database.DB()
	if err != nil {
		return nil, nil, fmt.Errorf("access MySQL connection pool: %w", err)
	}
	if err := sqlDatabase.PingContext(ctx); err != nil {
		_ = sqlDatabase.Close()
		return nil, nil, fmt.Errorf("ping MySQL: %w", err)
	}
	return database, func() { _ = sqlDatabase.Close() }, nil
}

func openRedis(ctx context.Context, cfg config.Redis) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{Addr: cfg.Address()})
	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("ping Redis: %w", err)
	}
	return client, nil
}
