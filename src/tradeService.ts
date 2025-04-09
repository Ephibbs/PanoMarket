import { Trade } from './types';

export class TradeService {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * Save a trade to the D1 database
     * @param trade - The trade to save
     */
    async saveTrade(trade: Trade): Promise<void> {
        await this.db.prepare(
            `INSERT INTO trades 
             (id, buy_asset, sell_asset, price, quantity, buy_order_id, sell_order_id, buy_user_id, sell_user_id, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
            trade.id, 
            trade.buy_asset, 
            trade.sell_asset, 
            trade.price, 
            trade.quantity, 
            trade.buy_order_id, 
            trade.sell_order_id, 
            trade.buy_user_id, 
            trade.sell_user_id, 
            trade.timestamp
        )
        .run();
    }

    /**
     * Save multiple trades in a batch
     * @param trades - Array of trades to save
     */
    async saveTrades(trades: Trade[]): Promise<void> {
        const stmt = this.db.prepare(
            `INSERT INTO trades 
             (id, buy_asset, sell_asset, price, quantity, buy_order_id, sell_order_id, buy_user_id, sell_user_id, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        const batch = this.db.batch();
        
        for (const trade of trades) {
            batch.add(stmt.bind(
                trade.id, 
                trade.buy_asset, 
                trade.sell_asset, 
                trade.price, 
                trade.quantity, 
                trade.buy_order_id, 
                trade.sell_order_id, 
                trade.buy_user_id, 
                trade.sell_user_id, 
                trade.timestamp
            ));
        }
        
        await batch.commit();
    }

    /**
     * Get all trades from the database
     */
    async getAllTrades(): Promise<Trade[]> {
        const result = await this.db.prepare(
            `SELECT * FROM trades ORDER BY timestamp DESC LIMIT 1000`
        ).all();
        
        return result.results as Trade[];
    }

    /**
     * Get trades for a specific user
     * @param userId - The user ID to filter by
     */
    async getUserTrades(userId: string): Promise<Trade[]> {
        const result = await this.db.prepare(
            `SELECT * FROM trades 
             WHERE buy_user_id = ? OR sell_user_id = ? 
             ORDER BY timestamp DESC 
             LIMIT 100`
        )
        .bind(userId, userId)
        .all();
        
        return result.results as Trade[];
    }

    /**
     * Get trades for a specific order
     * @param orderId - The order ID to filter by
     */
    async getOrderTrades(orderId: string): Promise<Trade[]> {
        const result = await this.db.prepare(
            `SELECT * FROM trades 
             WHERE buy_order_id = ? OR sell_order_id = ? 
             ORDER BY timestamp DESC`
        )
        .bind(orderId, orderId)
        .all();
        
        return result.results as Trade[];
    }

    /**
     * Get trades for a specific market (by assets)
     * @param buyAsset - The buy asset
     * @param sellAsset - The sell asset
     */
    async getMarketTrades(buyAsset: string, sellAsset: string): Promise<Trade[]> {
        const result = await this.db.prepare(
            `SELECT * FROM trades 
             WHERE (buy_asset = ? AND sell_asset = ?) OR (buy_asset = ? AND sell_asset = ?)
             ORDER BY timestamp DESC 
             LIMIT 100`
        )
        .bind(buyAsset, sellAsset, sellAsset, buyAsset)
        .all();
        
        return result.results as Trade[];
    }
} 