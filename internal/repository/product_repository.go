package repository

import (
	"context"
	"errors"
	"fmt"

	mysqldriver "github.com/go-sql-driver/mysql"
	"github.com/huylhn1810/redis-practice/internal/model"
	"gorm.io/gorm"
)

var (
	ErrProductNotFound = errors.New("product not found")
	ErrProductExists   = errors.New("product already exists")
)

type ProductRepository interface {
	Clear(ctx context.Context) error
	List(ctx context.Context) ([]model.Product, error)
	GetByID(ctx context.Context, id int) (*model.Product, error)
	Create(ctx context.Context, product model.Product) error
	Update(ctx context.Context, product model.Product) error
	Delete(ctx context.Context, id int) error
}

type productRecord struct {
	ID    int    `gorm:"column:id;primaryKey"`
	Name  string `gorm:"column:name"`
	Price int    `gorm:"column:price"`
	Stock int    `gorm:"column:stock"`
}

func (productRecord) TableName() string { return "products" }

type mysqlProductRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) ProductRepository {
	return &mysqlProductRepository{db: db}
}

func (r *mysqlProductRepository) Clear(ctx context.Context) error {
	if err := r.db.WithContext(ctx).Exec("TRUNCATE TABLE products").Error; err != nil {
		return fmt.Errorf("truncate products: %w", err)
	}
	return nil
}

func (r *mysqlProductRepository) List(ctx context.Context) ([]model.Product, error) {
	var records []productRecord
	if err := r.db.WithContext(ctx).Find(&records).Error; err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}

	products := make([]model.Product, 0, len(records))
	for _, record := range records {
		products = append(products, toModel(record))
	}
	return products, nil
}

func (r *mysqlProductRepository) GetByID(ctx context.Context, id int) (*model.Product, error) {
	var record productRecord
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&record).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrProductNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get product %d: %w", id, err)
	}

	product := toModel(record)
	return &product, nil
}

func (r *mysqlProductRepository) Create(ctx context.Context, product model.Product) error {
	record := fromModel(product)
	if err := r.db.WithContext(ctx).Create(&record).Error; err != nil {
		var mysqlErr *mysqldriver.MySQLError
		if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
			return ErrProductExists
		}
		return fmt.Errorf("create product %d: %w", product.ID, err)
	}
	return nil
}

func (r *mysqlProductRepository) Update(ctx context.Context, product model.Product) error {
	result := r.db.WithContext(ctx).
		Model(&productRecord{}).
		Where("id = ?", product.ID).
		Updates(map[string]any{
			"name": product.Name, "price": product.Price, "stock": product.Stock,
		})
	if result.Error != nil {
		return fmt.Errorf("update product %d: %w", product.ID, result.Error)
	}
	if result.RowsAffected == 0 {
		var count int64
		if err := r.db.WithContext(ctx).Model(&productRecord{}).
			Where("id = ?", product.ID).Count(&count).Error; err != nil {
			return fmt.Errorf("check product %d after update: %w", product.ID, err)
		}
		if count == 0 {
			return ErrProductNotFound
		}
	}
	return nil
}

func (r *mysqlProductRepository) Delete(ctx context.Context, id int) error {
	result := r.db.WithContext(ctx).Where("id = ?", id).Delete(&productRecord{})
	if result.Error != nil {
		return fmt.Errorf("delete product %d: %w", id, result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrProductNotFound
	}
	return nil
}

func toModel(record productRecord) model.Product {
	return model.Product{ID: record.ID, Name: record.Name, Price: record.Price, Stock: record.Stock}
}

func fromModel(product model.Product) productRecord {
	return productRecord{ID: product.ID, Name: product.Name, Price: product.Price, Stock: product.Stock}
}
