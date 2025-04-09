-- Create Trades table
CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    buy_asset TEXT NOT NULL,
    sell_asset TEXT NOT NULL,
    price REAL NOT NULL,
    quantity REAL NOT NULL,
    buy_order_id TEXT NOT NULL,
    sell_order_id TEXT NOT NULL,
    buy_user_id TEXT NOT NULL,
    sell_user_id TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_trades_buy_user ON trades(buy_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_sell_user ON trades(sell_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_buy_order ON trades(buy_order_id);
CREATE INDEX IF NOT EXISTS idx_trades_sell_order ON trades(sell_order_id); 