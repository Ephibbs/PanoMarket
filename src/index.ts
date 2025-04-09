import { OrderBook } from './orderbook';
import { Balances } from './balances';
import { 
	handleBalanceRoutes,
	handleTradeRoutes,
	handleMarketsManagementRoutes,
	handleMarketRoutes,
	Env 
} from './routes';

export { OrderBook, Balances };

// Main handler for Cloudflare Worker
export default {
	/**
	 * Fetch handler for the Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			const url = new URL(request.url);
			const path = url.pathname;

            // Perform user authentication...

			// Route requests to appropriate handlers
			if (path.startsWith('/balances')) {
				return await handleBalanceRoutes(request, env, path);
			} else if (path.startsWith('/trades')) {
				return await handleTradeRoutes(request, env, path);
			} else if (path.startsWith('/markets-manage')) {
				return await handleMarketsManagementRoutes(request, env, path);
			} else {
				return await handleMarketRoutes(request, env, path);
			}
		} catch (error) {
			console.error('Unhandled error:', error);
			return new Response(JSON.stringify({ error: (error as Error).message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	},
} satisfies ExportedHandler<Env>;
