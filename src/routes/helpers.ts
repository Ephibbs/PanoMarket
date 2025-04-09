/**
 * Helper functions for API routes
 */

/**
 * Create a JSON response with appropriate headers
 */
export function jsonResponse(data: any, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

/**
 * Create an error response with appropriate status code
 */
export function errorResponse(message: string, status = 400): Response {
	return jsonResponse({ error: message }, status);
} 