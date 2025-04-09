import { DurableObject } from "cloudflare:workers";
import { Order, Trade } from "./types";


/**
 * OrderBook - Durable Object implementation for an order book
 * Manages the order matching logic for a specific market
 */
export class OrderBook extends DurableObject {
    private sql: SqlStorage;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sql = ctx.storage.sql;
        
        // Initialize SQLite tables
        this.sql.exec(`
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                buy_asset TEXT NOT NULL,
                sell_asset TEXT NOT NULL,
                price REAL NOT NULL,
                quantity REAL NOT NULL,
                remaining_quantity REAL NOT NULL,
                side TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_orders_side_price ON orders(side, price) 
            WHERE status != 'filled';
        `);
    }

    /**
     * Handle creating a new order
     */
    async handleOrder(orderData: object) {
        const { id, user_id, price, quantity, side, buy_asset, sell_asset } = orderData as Order;
        
        if (!id || !user_id || !price || !quantity || !side) {
            return new Response('Missing required fields', { status: 400 });
        }

        // Try to match the order
        const { trades, remainingQuantity } = await this.matchOrder({orderId: id, userId: user_id, side, price, quantity, buyAsset: buy_asset, sellAsset: sell_asset});

        // Add it to the order book
        let status: 'open' | 'filled' | 'partiallyfilled' = 'open';
        if (remainingQuantity > 0) {
            status = trades.length > 0 ? 'partiallyfilled' : 'open';
        } else {
            status = 'filled';
        }

        const order: Order = {
            id,
            user_id,
            buy_asset,
            sell_asset,
            price,
            quantity,
            remaining_quantity: remainingQuantity,
            side,
            status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.sql.exec(`
            INSERT INTO orders 
            (id, user_id, buy_asset, sell_asset, price, quantity, remaining_quantity, side, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, order.id, order.user_id, order.buy_asset, order.sell_asset, order.price, order.quantity, order.remaining_quantity, 
            order.side, order.status, order.created_at, order.updated_at);

        return { 
            status: 'success',
            trades,
            remainingQuantity,
            orderStatus: status
        };
    }

    /**
     * Get current order book state
     */
    async getOrderBook() {
        const asks = this.sql.exec(`
            SELECT * FROM orders 
            WHERE side = 'sell' AND status != 'filled'
            ORDER BY price ASC
        `).toArray();

        const bids = this.sql.exec(`
            SELECT * FROM orders 
            WHERE side = 'buy' AND status != 'filled'
            ORDER BY price DESC
        `).toArray();

        return {
            asks,
            bids
        };
    }

    /**
     * Core matching logic - finds and executes a match for the given order
     */
    async matchOrder({
        orderId,
        userId,
        side,
        price,
        quantity,
        buyAsset,
        sellAsset
    }: {
        orderId: string,
        userId: string,
        side: 'buy' | 'sell',
        price: number,
        quantity: number,
        buyAsset: string,
        sellAsset: string
    }): Promise<{ trades: Trade[], remainingQuantity: number }> {
        let trades: Trade[] = [];
        let remainingQuantity = quantity;

        while (remainingQuantity > 0) {
            try {
                // Find matching order
				let matchingOrder: Order | null = null;
				try {
					matchingOrder = this.sql.exec(`
						SELECT * FROM orders 
						WHERE side = ? AND status != 'filled'
						AND (? = 'buy' AND price <= ? OR ? = 'sell' AND price >= ?)
						ORDER BY price ${side === 'buy' ? 'ASC' : 'DESC'}, created_at ASC
						LIMIT 1
					`, side === 'buy' ? 'sell' : 'buy', side, price, side, price).one() as unknown as Order;
				} catch (error) {
					throw new Error('No matching order found');
				}
                if (!matchingOrder) {
                    // No more matching orders, break out of the transaction
                    throw new Error('No matching order found');
                }

                const fillQuantity = Math.min(remainingQuantity, matchingOrder.remaining_quantity);

                // Update matching order
                this.sql.exec(`
                    UPDATE orders 
                    SET remaining_quantity = remaining_quantity - ?,
                        status = CASE 
                            WHEN remaining_quantity - ? <= 0 THEN 'filled'
                            ELSE 'partiallyfilled'
                        END,
                        updated_at = ?
                    WHERE id = ?
                `, fillQuantity, fillQuantity, new Date().toISOString(), matchingOrder.id);

                // Create trade record
                const trade: Trade = {
                    id: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
                    buy_asset: side === 'buy' ? buyAsset : sellAsset,
                    sell_asset: side === 'buy' ? sellAsset : buyAsset,
                    price: matchingOrder.price,
                    quantity: fillQuantity,
                    buy_order_id: side === 'buy' ? orderId : matchingOrder.id,
                    sell_order_id: side === 'buy' ? matchingOrder.id : orderId,
                    buy_user_id: side === 'buy' ? userId : matchingOrder.user_id,
                    sell_user_id: side === 'buy' ? matchingOrder.user_id : userId,
                    timestamp: new Date().toISOString()
                };

                trades.push(trade);
                remainingQuantity -= fillQuantity;
            } catch (error: any) {
                if (error.message === 'No matching order found') {
                    break;
                }
                throw error;
            }
        }

        return { trades, remainingQuantity };
    }

    /**
     * Get user orders
     */
    async getUserOrders(userId: string) {
        const orders = this.sql.exec(`
            SELECT * FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, userId).toArray();
        return orders;
    }
} 
