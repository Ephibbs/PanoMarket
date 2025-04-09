-- Create Markets table
CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    buy_asset TEXT NOT NULL,
    sell_asset TEXT NOT NULL,
    description TEXT,
    min_order_size REAL,
    price_precision INTEGER,
    quantity_precision INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_markets_assets ON markets(buy_asset, sell_asset);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_asset_pair ON markets(buy_asset, sell_asset) WHERE status = 'active'; 