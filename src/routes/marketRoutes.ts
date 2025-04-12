/**
 * Route handlers for market operations
 */
import { errorResponse, jsonResponse } from './helpers';
import { BalancesStub, Env, OrderBookStub, OrderRequest } from './types';
import { Order } from '../types';
import { TradeService } from '../tradeService';
import { TradeBroadcaster } from '../broadcast';

export async function handleMarketRoutes(
	request: Request,
	env: Env,
	path: string,
	context: ExecutionContext
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
		const orderRequest = await request.json() as OrderRequest;
		
		// Validate order
		if (!orderRequest.user_id || !orderRequest.side || !orderRequest.price || !orderRequest.quantity) {
			return errorResponse('Invalid order: missing required fields');
		}

        const [buyAsset, sellAsset] = market.split(":");
        const order = {
            ...orderRequest,
            id: crypto.randomUUID(),
            buy_asset: buyAsset,
            sell_asset: sellAsset
        } as Order;
		
		// Reserve balance for the order
		const balancesId = env.BALANCES.idFromName('global');
		const balancesStub = env.BALANCES.get(balancesId) as unknown as BalancesStub;
        let start, end;
        start = Date.now();
		const reserveResult = await balancesStub.reserveBalance(order);
        end = Date.now();
        console.log(` - Reserve balance outer took ${end - start}ms`);
		
		if (!reserveResult) {
			return errorResponse('Insufficient balance');
		}
		
		// Process the order
        start = Date.now();
		const { status, trades, remainingQuantity, orderStatus } = await stub.handleOrder(order);
        end = Date.now();
        console.log(` - Handle order outer took ${end - start}ms`);

        // Send immediate response
        const response = { status, trades, remainingQuantity, orderStatus };
        
        // Process remaining operations using waitUntil
        context.waitUntil((async () => {
            // Update balances based on trades
            start = Date.now();
            await balancesStub.updateBalances(trades);
            end = Date.now();
            console.log(` - Update balances took ${end - start}ms`);

            const id = env.TRADE_BROADCASTER.idFromName(market);
            const broadcasterStub = env.TRADE_BROADCASTER.get(id) as unknown as TradeBroadcaster;
            
            // Save trades to D1 database
            start = Date.now();
            if (trades.length > 0) {
				console.log('Saving trades to D1 database');
                const tradeService = new TradeService(env.PANOMARKET_DB);
                await tradeService.saveTrades(trades);
				await broadcasterStub.broadcastTrades(trades);
            }
            end = Date.now();
            console.log(` - Save trades took ${end - start}ms`);
        })().catch(error => {
            console.error('Error in async operations:', error);
        }));

        return jsonResponse(response);
	}

	return errorResponse('Not found', 404);
} 