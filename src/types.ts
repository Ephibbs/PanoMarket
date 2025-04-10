/**
 * Interface representing an order in the order book
 */
export interface Order {
    id: string;
    user_id: string;
    buy_asset: string;
    sell_asset: string;
    price: number;
    quantity: number;
    remaining_quantity: number;
    side: 'buy' | 'sell';
    status: 'open' | 'filled' | 'partiallyfilled';
    created_at: string;
    updated_at: string;
}

/**
 * Interface representing a trade that occurs when orders match
 */
export interface Trade {
    id: string;
    buy_asset: string;
    sell_asset: string;
    price: number;
    quantity: number;
    buy_order_id: string;
    sell_order_id: string;
    buy_user_id: string;
    sell_user_id: string;
    timestamp: string;
}

/**
 * Interface representing a user balance
 */
export interface Balance {
    user_id: string;
    asset: string;
    available: number;
    reserved: number;
}

/**
 * Interface representing a market
 */
export interface Market {
    id: string;
    buy_asset: string;
    sell_asset: string;
    description?: string;
    min_order_size?: number;
    price_precision?: number;
    quantity_precision?: number;
    status: 'active' | 'inactive' | 'deprecated';
    created_at: string;
    updated_at: string;
}