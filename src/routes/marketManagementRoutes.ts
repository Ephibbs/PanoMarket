/**
 * Route handlers for market management operations
 */
import { errorResponse, jsonResponse } from './helpers';
import { Env, MarketCreateRequest, MarketUpdateRequest } from './types';
import { Market } from '../types';
import { MarketService } from '../marketService';

export async function handleMarketsManagementRoutes(
	request: Request,
	env: Env,
	path: string
): Promise<Response> {
	const marketService = new MarketService(env.TRADES_DB);
	const segments = path.split('/').filter(Boolean);
	
	// GET /markets-manage - List all markets
	if (segments.length === 1 && segments[0] === 'markets-manage' && request.method === 'GET') {
		const activeOnly = new URL(request.url).searchParams.get('active') === 'true';
		const markets = await marketService.getAllMarkets(activeOnly);
		return jsonResponse(markets);
	}
	
	// GET /markets-manage/{id} - Get market by ID
	if (segments.length === 2 && segments[0] === 'markets-manage' && request.method === 'GET') {
		const id = segments[1];
		const market = await marketService.getMarketById(id);
		
		if (!market) {
			return errorResponse('Market not found', 404);
		}
		
		return jsonResponse(market);
	}
	
	// POST /markets-manage - Create a new market
	if (segments.length === 1 && segments[0] === 'markets-manage' && request.method === 'POST') {
		const data = await request.json() as MarketCreateRequest;
		
		// Validate required fields
		if (!data.name || !data.buy_asset || !data.sell_asset) {
			return errorResponse('Missing required fields: name, buy_asset, sell_asset');
		}
		
		// Check if market already exists
		const existingMarket = await marketService.getMarketByAssets(data.buy_asset, data.sell_asset);
		if (existingMarket) {
			return errorResponse('A market with this asset pair already exists');
		}
		
		// Create new market
		const market: Market = {
			id: `market-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
			name: data.name,
			buy_asset: data.buy_asset,
			sell_asset: data.sell_asset,
			description: data.description,
			min_order_size: data.min_order_size,
			price_precision: data.price_precision,
			quantity_precision: data.quantity_precision,
			status: 'active',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};
		
		await marketService.createMarket(market);
		
		return jsonResponse(market, 201);
	}
	
	// PATCH /markets-manage/{id} - Update a market
	if (segments.length === 2 && segments[0] === 'markets-manage' && request.method === 'PATCH') {
		const id = segments[1];
		const data = await request.json() as MarketUpdateRequest;
		
		// Check if market exists
		const existingMarket = await marketService.getMarketById(id);
		if (!existingMarket) {
			return errorResponse('Market not found', 404);
		}
		
		// Update market
		const success = await marketService.updateMarket(id, data);
		
		if (!success) {
			return errorResponse('Failed to update market');
		}
		
		// Get updated market
		const updatedMarket = await marketService.getMarketById(id);
		return jsonResponse(updatedMarket);
	}
	
	// POST /markets-manage/{id}/status - Update market status
	if (segments.length === 3 && segments[0] === 'markets-manage' && segments[2] === 'status' && request.method === 'POST') {
		const id = segments[1];
		const { status } = await request.json() as { status: 'active' | 'inactive' | 'deprecated' };
		
		if (!status || !['active', 'inactive', 'deprecated'].includes(status)) {
			return errorResponse('Invalid status value');
		}
		
		// Check if market exists
		const existingMarket = await marketService.getMarketById(id);
		if (!existingMarket) {
			return errorResponse('Market not found', 404);
		}
		
		// Update status
		const success = await marketService.setMarketStatus(id, status);
		
		if (!success) {
			return errorResponse('Failed to update market status');
		}
		
		return jsonResponse({ success: true, message: `Market status updated to ${status}` });
	}
	
	return errorResponse('Invalid request', 404);
} 