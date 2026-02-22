CREATE TABLE IF NOT EXISTS grain_stocks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    production_zone_id INTEGER REFERENCES production_zones(id) NOT NULL,
    grain_type VARCHAR(50) NOT NULL,
    campaign VARCHAR(20) NOT NULL,
    
    -- Stock Values
    initial_stock DECIMAL(15, 2) DEFAULT 0,
    sold_delivered DECIMAL(15, 2) DEFAULT 0,
    livestock_consumption DECIMAL(15, 2) DEFAULT 0,
    seeds DECIMAL(15, 2) DEFAULT 0,
    extruder_own DECIMAL(15, 2) DEFAULT 0,
    extruder_exchange DECIMAL(15, 2) DEFAULT 0,
    exchanges DECIMAL(15, 2) DEFAULT 0,
    committed_sales DECIMAL(15, 2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure uniqueness per zone/grain/campaign to prevent duplicates
    UNIQUE(production_zone_id, grain_type, campaign)
);
