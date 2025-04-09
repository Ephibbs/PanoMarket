/**
 * Route handlers for balance operations
 */
import { errorResponse, jsonResponse } from './helpers';
import { BalanceAddRequest, BalancesStub, Env, TransferRequest } from './types';

export async function handleBalanceRoutes(
	request: Request,
	env: Env,
	path: string
): Promise<Response> {
	const segments = path.split('/').filter(Boolean);
	const userId = segments[1];
	const balancesId = env.BALANCES.idFromName('global');
	const balancesStub = env.BALANCES.get(balancesId) as unknown as BalancesStub;

	// GET /balances or GET /balances/{userId}
	if (request.method === 'GET') {
		if (userId) {
			const result = await balancesStub.getUserBalances(userId);
			return jsonResponse(result);
		} else {
			const result = await balancesStub.getAllBalances();
			return jsonResponse(result);
		}
	}

	// POST /balances/{userId}
	if (request.method === 'POST' && userId) {
		const data = await request.json() as BalanceAddRequest;
		
		if (!data.asset || data.amount === undefined) {
			return errorResponse('Missing required fields: asset, amount');
		}
		
		const result = await balancesStub.addUserBalance(userId, data);
		return jsonResponse(result);
	}

	// POST /balances/transfer
	if (request.method === 'POST' && path.includes('/transfer')) {
		const data = await request.json() as TransferRequest;

		if (!data.fromUserId || !data.toUserId || !data.asset || data.amount === undefined) {
			return errorResponse('Missing required fields: fromUserId, toUserId, asset, amount');
		}

		const result = await balancesStub.transferBalance(
			data.fromUserId,
			data.toUserId,
			data.asset,
			data.amount
		);
		
		return jsonResponse({
			success: result,
			message: result ? 'Transfer completed' : 'Transfer failed'
		});
	}

	return errorResponse('Invalid request');
} 