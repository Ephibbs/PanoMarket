import { DurableObject } from "cloudflare:workers";
import { Order, Trade } from "./types";

/**
 * Balances - Durable Object implementation for managing user balances
 * Provides methods to view, add, update, and manage user balances
 */
export class Balances extends DurableObject {
    private sql: SqlStorage;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sql = ctx.storage.sql;
        
        // Initialize SQLite table
        this.sql.exec(`
            CREATE TABLE IF NOT EXISTS balances (
                user_asset TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                asset TEXT NOT NULL, 
                available REAL NOT NULL,
                reserved REAL NOT NULL,
                updated_at TEXT NOT NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_balances_user_id ON balances(user_id);
        `);
    }

    /**
     * Get all balances in the system
     */
    async getAllBalances() {
        const balances = this.sql.exec(`
            SELECT * FROM balances ORDER BY user_id, asset
        `).toArray();
        
        return balances;
    }

    /**
     * Get all balances for a specific user
     * @param userId - The ID of the user
     */
    async getUserBalances(userId: string) {
        const balances = this.sql.exec(`
            SELECT * FROM balances 
            WHERE user_id = ?
            ORDER BY asset
        `, userId).toArray();
        
        return balances;
    }

    /**
     * Add or update a user's balance for a specific asset
     * @param userId - The ID of the user
     * @param data - Object containing asset and amount
     */
    async addUserBalance(userId: string, data: { asset: string, amount: number }) {
        const { asset, amount } = data;
        
        if (!asset || amount === undefined) {
            throw new Error('Missing required fields: asset and amount');
        }

        if (amount < 0) {
            throw new Error('Amount cannot be negative');
        }

        const userAssetKey = `${userId}:${asset}`;
        
        // Check if the user already has a balance for this asset
        let existingBalance = null;
        try {
            existingBalance = this.sql.exec(`
                SELECT * FROM balances WHERE user_asset = ?
            `, userAssetKey).one();
        } catch (error) {
            // No existing balance found
        }

        if (existingBalance) {
            // Update existing balance
            this.sql.exec(`
                UPDATE balances 
                SET available = available + ?,
                    updated_at = ?
                WHERE user_asset = ?
            `, amount, new Date().toISOString(), userAssetKey);
        } else {
            // Create new balance
            this.sql.exec(`
                INSERT INTO balances 
                (user_asset, user_id, asset, available, reserved, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, userAssetKey, userId, asset, amount, 0, new Date().toISOString());
        }

        return this.getUserBalances(userId);
    }

    /**
     * Reserve a portion of a user's available balance
     * @param userId - The ID of the user
     * @param asset - The asset to reserve
     * @param amount - The amount to reserve
     */
    async reserveBalance(order: Order): Promise<boolean> {
        const { user_id, buy_asset, sell_asset, side, price, quantity } = order;
        const amount = side === 'buy' ? price * quantity : quantity;
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        const asset = side === 'buy' ? buy_asset : sell_asset;
        const userAssetKey = `${user_id}:${asset}`;
        
        // Check if the user has sufficient balance
        let balance = null;
        try {
            balance = this.sql.exec<{ available: number, reserved: number }>(`
                SELECT available, reserved FROM balances WHERE user_asset = ?
            `, userAssetKey).one();
        } catch (error) {
            throw new Error('Insufficient balance');
        }

        if (!balance || balance.available < amount) {
            return false;
        }

        // Update the balance
        this.sql.exec(`
            UPDATE balances 
            SET available = available - ?,
                reserved = reserved + ?,
                updated_at = ?
            WHERE user_asset = ?
        `, amount, amount, new Date().toISOString(), userAssetKey);

        return true;
    }

    /**
     * Release reserved balance back to available
     * @param userId - The ID of the user
     * @param asset - The asset to release
     * @param amount - The amount to release
     */
    async releaseBalance(userId: string, asset: string, amount: number): Promise<boolean> {
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        const userAssetKey = `${userId}:${asset}`;
        
        // Check if the user has sufficient reserved balance
        let balance = null;
        try {
            balance = this.sql.exec<{ reserved: number }>(`
                SELECT reserved FROM balances WHERE user_asset = ?
            `, userAssetKey).one();
        } catch (error) {
            throw new Error('No reserved balance found');
        }

        if (!balance || balance.reserved < amount) {
            return false;
        }

        // Update the balance
        this.sql.exec(`
            UPDATE balances 
            SET available = available + ?,
                reserved = reserved - ?,
                updated_at = ?
            WHERE user_asset = ?
        `, amount, amount, new Date().toISOString(), userAssetKey);

        return true;
    }
    
    /**
     * Transfer balance from one user to another
     * @param fromUserId - The ID of the sender
     * @param toUserId - The ID of the recipient
     * @param asset - The asset to transfer
     * @param amount - The amount to transfer
     */
    async transferBalance(fromUserId: string, toUserId: string, asset: string, amount: number): Promise<boolean> {
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        const fromUserAssetKey = `${fromUserId}:${asset}`;

        // Check if sender has sufficient available balance
        let senderBalance = null;
        try {
            senderBalance = this.sql.exec<{ available: number }>(`
                SELECT available FROM balances WHERE user_asset = ?
            `, fromUserAssetKey).one();
        } catch (error) {
            throw new Error('Insufficient balance');
        }

        if (!senderBalance || senderBalance.available < amount) {
            return false;
        }

        // Deduct from sender
        this.sql.exec(`
            UPDATE balances 
            SET available = available - ?,
                updated_at = ?
            WHERE user_asset = ?
        `, amount, new Date().toISOString(), fromUserAssetKey);

        // Add to recipient
        const toUserAssetKey = `${toUserId}:${asset}`;
        const recipientBalance = this.sql.exec(`
            SELECT * FROM balances WHERE user_asset = ?
        `, toUserAssetKey).one();

        if (recipientBalance) {
            // Update existing balance
            this.sql.exec(`
                UPDATE balances 
                SET available = available + ?,
                    updated_at = ?
                WHERE user_asset = ?
            `, amount, new Date().toISOString(), toUserAssetKey);
        } else {
            // Create new balance
            this.sql.exec(`
                INSERT INTO balances 
                (user_asset, user_id, asset, available, reserved, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, toUserAssetKey, toUserId, asset, amount, 0, new Date().toISOString());
        }

        return true;
    }

    /**
     * Update balances based on trades
     * @param trades - Array of trade objects
     */
    async updateBalances(trades: Trade[]) {
        for (const trade of trades) {
            const { buy_user_id, sell_user_id, price, quantity, buy_asset, sell_asset } = trade;
            await this.transferBalance(buy_user_id, sell_user_id, buy_asset, price * quantity);
            await this.transferBalance(sell_user_id, buy_user_id, sell_asset, quantity);
        }
    }
}
