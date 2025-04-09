import { Market } from './types';

export class MarketService {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * Create a new market
     * @param market - The market data
     */
    async createMarket(market: Market): Promise<void> {
        // Ensure timestamps are set
        if (!market.created_at) {
            market.created_at = new Date().toISOString();
        }
        if (!market.updated_at) {
            market.updated_at = new Date().toISOString();
        }
        
        await this.db.prepare(
            `INSERT INTO markets 
             (id, name, buy_asset, sell_asset, description, min_order_size, 
              price_precision, quantity_precision, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
            market.id,
            market.name,
            market.buy_asset,
            market.sell_asset,
            market.description || null,
            market.min_order_size || null,
            market.price_precision || null,
            market.quantity_precision || null,
            market.status,
            market.created_at,
            market.updated_at
        )
        .run();
    }

    /**
     * Get all markets
     * @param activeOnly - If true, only return active markets
     */
    async getAllMarkets(activeOnly = false): Promise<Market[]> {
        const query = activeOnly 
            ? 'SELECT * FROM markets WHERE status = ? ORDER BY name'
            : 'SELECT * FROM markets ORDER BY name';
        
        const params = activeOnly ? ['active'] : [];
        
        const result = await this.db.prepare(query)
            .bind(...params)
            .all();
            
        return result.results as unknown as Market[];
    }

    /**
     * Get a market by ID
     * @param id - The market ID
     */
    async getMarketById(id: string): Promise<Market | null> {
        const result = await this.db.prepare(
            'SELECT * FROM markets WHERE id = ?'
        )
        .bind(id)
        .first<Market>();
        
        return result || null;
    }

    /**
     * Get a market by asset pair
     * @param buyAsset - The buy asset
     * @param sellAsset - The sell asset
     */
    async getMarketByAssets(buyAsset: string, sellAsset: string): Promise<Market | null> {
        const result = await this.db.prepare(
            `SELECT * FROM markets 
             WHERE (buy_asset = ? AND sell_asset = ?) OR (buy_asset = ? AND sell_asset = ?)
             AND status = 'active'`
        )
        .bind(buyAsset, sellAsset, sellAsset, buyAsset)
        .first<Market>();
        
        return result || null;
    }

    /**
     * Update a market
     * @param id - The market ID
     * @param updates - The fields to update
     */
    async updateMarket(id: string, updates: Partial<Market>): Promise<boolean> {
        // Don't allow changing certain fields
        delete updates.id;
        delete updates.created_at;
        
        // Always update the updated_at timestamp
        updates.updated_at = new Date().toISOString();
        
        // Build the update query
        const fields = Object.keys(updates);
        if (fields.length === 0) {
            return true; // Nothing to update
        }
        
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => (updates as any)[field]);
        
        const result = await this.db.prepare(
            `UPDATE markets SET ${setClause} WHERE id = ?`
        )
        .bind(...values, id)
        .run();
        
        return result.success;
    }

    /**
     * Change market status
     * @param id - The market ID
     * @param status - The new status
     */
    async setMarketStatus(id: string, status: 'active' | 'inactive' | 'deprecated'): Promise<boolean> {
        const result = await this.db.prepare(
            'UPDATE markets SET status = ?, updated_at = ? WHERE id = ?'
        )
        .bind(status, new Date().toISOString(), id)
        .run();
        
        return result.success;
    }
} 