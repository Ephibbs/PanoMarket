/**
 * Route handlers for trade operations
 */
import { errorResponse, jsonResponse } from './helpers';
import { Env } from './types';
import { TradeService } from '../tradeService';

export async function handleTradeRoutes(
	request: Request,
	env: Env,
	path: string
): Promise<Response> {
	const tradeService = new TradeService(env.TRADES_DB);
	const segments = path.split('/').filter(Boolean);
	
	// GET /trades - Get all trades
	if (segments.length === 1 && segments[0] === 'trades' && request.method === 'GET') {
		const trades = await tradeService.getAllTrades();
		return jsonResponse(trades);
	}
	
	// GET /trades/user/{userId} - Get trades for a specific user
	if (segments.length === 3 && segments[0] === 'trades' && segments[1] === 'user' && request.method === 'GET') {
		const userId = segments[2];
		const trades = await tradeService.getUserTrades(userId);
		return jsonResponse(trades);
	}
	
	// GET /trades/order/{orderId} - Get trades for a specific order
	if (segments.length === 3 && segments[0] === 'trades' && segments[1] === 'order' && request.method === 'GET') {
		const orderId = segments[2];
		const trades = await tradeService.getOrderTrades(orderId);
		return jsonResponse(trades);
	}
	
	// GET /trades/market/{buyAsset}/{sellAsset} - Get trades for a specific market
	if (segments.length === 4 && segments[0] === 'trades' && segments[1] === 'market' && request.method === 'GET') {
		const buyAsset = segments[2];
		const sellAsset = segments[3];
		const trades = await tradeService.getMarketTrades(buyAsset, sellAsset);
		return jsonResponse(trades);
	}
	
	return errorResponse('Invalid request', 404);
} 