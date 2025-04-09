/**
 * Route handlers for market operations
 */
import { errorResponse, jsonResponse } from './helpers';
import { BalancesStub, Env, OrderBookStub } from './types';
import { Order } from '../types';
import { TradeService } from '../tradeService';

export async function handleMarketRoutes(
	request: Request,
	env: Env,
	path: string
): Promise<Response> {
	const segments = path.split('/').filter(Boolean);
	
	if (segments[0] !== 'markets') {
		return errorResponse('Invalid path');
	}
	
	const market = segments[1];
	const finalPath = segments[2];
	const userId = segments[3];
	
	if (!market) {
		return errorResponse('Market is required');
	}
	
	const id = env.ORDER_BOOK.idFromName(market);
	const stub = env.ORDER_BOOK.get(id) as unknown as OrderBookStub;

	// GET /markets/{market}/orders or GET /markets/{market}/orders/{userId}
	if (request.method === 'GET' && finalPath === 'orders') {
		let result;
		if (userId) {
			result = await stub.getUserOrders(userId);
		} else {
			result = await stub.getOrderBook();
		}
		return jsonResponse(result);
	}

	// POST /markets/{market}/orders
	if (request.method === 'POST' && finalPath === 'orders') {
		const order = await request.json() as Order;
		
		// Validate order
		if (!order.user_id || !order.side || !order.price || !order.quantity) {
			return errorResponse('Invalid order: missing required fields');
		}
		
		// Reserve balance for the order
		const balancesId = env.BALANCES.idFromName('global');
		const balancesStub = env.BALANCES.get(balancesId) as unknown as BalancesStub;
		const reserveResult = await balancesStub.reserveBalance(order);
		
		if (!reserveResult) {
			return errorResponse('Insufficient balance');
		}
		
		// Process the order
		const { status, trades, remainingQuantity, orderStatus } = await stub.handleOrder(order);
		
		// Update balances based on trades
		const updateResult = await balancesStub.updateBalances(trades);
		
		if (!updateResult) {
			return errorResponse('Failed to update balances');
		}
		
		// Save trades to D1 database
		if (trades.length > 0) {
			const tradeService = new TradeService(env.TRADES_DB);
			await tradeService.saveTrades(trades);
		}
		
		return jsonResponse({ status, trades, remainingQuantity, orderStatus });
	}

	return errorResponse('Not found', 404);
} 