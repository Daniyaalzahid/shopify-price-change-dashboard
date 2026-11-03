CREATE TABLE IF NOT EXISTS price_updates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id CHAR(36) NOT NULL,
  actor_name VARCHAR(190) NOT NULL,
  variant_id VARCHAR(100) NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  old_price DECIMAL(20,4) NOT NULL,
  new_price DECIMAL(20,4) NOT NULL,
  status VARCHAR(20) NOT NULL,
  detail VARCHAR(255) NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  INDEX price_updates_actor (actor_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
