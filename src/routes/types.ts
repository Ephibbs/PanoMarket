/**
 * Interface definitions for route handlers
 */
import { Order, Trade } from '../types';

export interface Env {
	ORDER_BOOK: DurableObjectNamespace;
	BALANCES: DurableObjectNamespace;
	PANOMARKET_DB: D1Database;
}

export interface OrderBookStub extends DurableObjectStub {
	getUserOrders(userId: string): Promise<any>;
	getOrderBook(): Promise<any>;
	handleOrder(order: Order): Promise<{
		status: string;
		trades: Trade[];
		remainingQuantity: number;
		orderStatus: string;
	}>;
}

export interface BalancesStub extends DurableObjectStub {
	getUserBalances(userId: string): Promise<any>;
	getAllBalances(): Promise<any>;
	addUserBalance(userId: string, data: { asset: string; amount: number }): Promise<any>;
	transferBalance(fromUserId: string, toUserId: string, asset: string, amount: number): Promise<boolean>;
	reserveBalance(order: Order): Promise<boolean>;
	updateBalances(trades: Trade[]): Promise<boolean>;
}

export interface TransferRequest {
	fromUserId: string;
	toUserId: string;
	asset: string;
	amount: number;
}

export interface BalanceAddRequest {
	asset: string;
	amount: number;
}

export interface MarketCreateRequest {
	buy_asset: string;
	sell_asset: string;
	description?: string;
	min_order_size?: number;
	price_precision?: number;
	quantity_precision?: number;
}

export interface MarketUpdateRequest {
	name?: string;
	description?: string;
	min_order_size?: number;
	price_precision?: number;
	quantity_precision?: number;
	status?: 'active' | 'inactive' | 'deprecated';
} 

export interface OrderRequest {
	user_id: string;
	side: 'buy' | 'sell';
	price: number;
	quantity: number;
}