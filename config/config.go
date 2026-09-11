package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Database  Database
	Redis     Redis
	RateLimit RateLimit
	Server    Server
}

type Database struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

func (database Database) DSN() string {
	return fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		database.User,
		database.Password,
		database.Host,
		database.Port,
		database.Name,
	)
}

type Redis struct {
	Host string
	Port string
}

func (redis Redis) Address() string {
	return redis.Host + ":" + redis.Port
}

type Server struct {
	Port string
}

type RateLimit struct {
	MaxRequests int
	Window      time.Duration
}

func Load() (Config, error) {
	database, databaseErr := loadDatabase()
	redis, redisErr := loadRedis()
	rateLimit, rateLimitErr := loadRateLimit()
	server, serverErr := loadServer()
	if err := errors.Join(databaseErr, redisErr, rateLimitErr, serverErr); err != nil {
		return Config{}, err
	}
	return Config{Database: database, Redis: redis, RateLimit: rateLimit, Server: server}, nil
}

func loadDatabase() (Database, error) {
	host, hostErr := required("DB_HOST")
	port, portErr := required("DB_PORT")
	user, userErr := required("DB_USER")
	password, passwordErr := required("DB_PASSWORD")
	name, nameErr := required("DB_NAME")
	if err := errors.Join(hostErr, portErr, userErr, passwordErr, nameErr); err != nil {
		return Database{}, err
	}
	return Database{Host: host, Port: port, User: user, Password: password, Name: name}, nil
}

func loadRedis() (Redis, error) {
	host, hostErr := required("REDIS_HOST")
	port, portErr := required("REDIS_PORT")
	if err := errors.Join(hostErr, portErr); err != nil {
		return Redis{}, err
	}
	return Redis{Host: host, Port: port}, nil
}

func loadRateLimit() (RateLimit, error) {
	maxRequests, maxRequestsErr := positiveIntEnv("MAX_REQUESTS", 10)
	windowSeconds, windowSecondsErr := positiveIntEnv("WINDOW_SECONDS", 10)
	if err := errors.Join(maxRequestsErr, windowSecondsErr); err != nil {
		return RateLimit{}, err
	}
	return RateLimit{
		MaxRequests: maxRequests,
		Window:      time.Duration(windowSeconds) * time.Second,
	}, nil
}

func loadServer() (Server, error) {
	port, err := required("SERVER_PORT")
	if err != nil {
		return Server{}, err
	}
	return Server{Port: port}, nil
}

func required(key string) (string, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return "", fmt.Errorf("%s is required", key)
	}
	return value, nil
}

func atoiEnv(key string, defaultValue int) (int, error) {
	value := strings.TrimSpace(os.Getenv(key))

	if value == "" {
		return defaultValue, nil
	}

	n, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("%s must be an integer: %w", key, err)
	}

	return n, nil
}

func positiveIntEnv(key string, defaultValue int) (int, error) {
	value, err := atoiEnv(key, defaultValue)
	if err != nil {
		return 0, err
	}
	if value <= 0 {
		return 0, fmt.Errorf("%s must be greater than 0", key)
	}
	return value, nil
}
