package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Database Database
	Redis    Redis
	Server   Server
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

func Load() (Config, error) {
	database, databaseErr := loadDatabase()
	redis, redisErr := loadRedis()
	server, serverErr := loadServer()
	if err := errors.Join(databaseErr, redisErr, serverErr); err != nil {
		return Config{}, err
	}
	return Config{Database: database, Redis: redis, Server: server}, nil
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
