<div align="center">
  <h1>💎 Pano</h1>
  <p><strong>The global centralized exchange for anything</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Built with Cloudflare Workers](https://img.shields.io/badge/Built%20with-Cloudflare-orange.svg)](https://workers.cloudflare.com/) [![Throughput](https://img.shields.io/badge/Throughput-330%20orders%2Fs-success.svg)](#performance)
  
  <p>
    <a href="#overview">Overview</a> •
    <a href="#features">Features</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#api-reference">API</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

## Overview

What if you could just spin up a centralized exchange for anything, not just crypto or stocks? Pano is centralized serverless exchange infrastructure built on top of Cloudflare that allows creating auto-scalable clusters of trading markets for literally anything. Built on Cloudflare's edge infrastructure, it provides global scalability and ultra-high throughput trading capabilities of up to ~330 orders/second for any asset pair.

## Features

- **Create Markets**: Create your own assets and operate markets for any asset pair
- **Centralized Ledger**: Track asset balances for millions of users
- **Global Scalability**: Leveraging Cloudflare's global network for worldwide accessibility
- **Low Latency**: Built for high-performance trading at <30ms latency
- **High Throughput**: Handles up to ~330 orders/second
- **Serverless Architecture**: No servers to maintain, scale automatically with demand
- **Complete Customizability**: Adapt and extend to meet specific market requirements
- **Isolated Markets**: Each market runs in its own Durable Object for data consistency and reliability

## Performance

<div align="center">
  <img src="assets/latency-graph.png" alt="Panomarket Latency Performance" width="700">
  <p><em>Figure: Average order execution latency including travel time</em></p>
</div>

The test was performed by running each number of concurrent orders for 10 seconds.

## Technology Stack

- **Cloudflare Durable Objects**: For consistent, globally-distributed state management
- **TypeScript**: Type-safe codebase for reliability and maintainability
- **Cloudflare D1**: SQLite-compatible serverless database on the edge
- **Cloudflare Workers**: Serverless compute platform for the API layer

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) for Cloudflare Workers development

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ephibbs/panomarket.git
   cd panomarket
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your Cloudflare account with Wrangler:
   ```bash
   npx wrangler login
   ```

4. Deploy to Cloudflare:
   ```bash
   npm run deploy
   ```

## Setting up D1 Database for Trades and Markets

This project uses Cloudflare D1 to store trade history and market information. Follow these steps to set up the D1 database:

1. Create a new D1 database:
```bash
npx wrangler d1 create panomarket-db
```

2. Take note of the database ID returned by the command and update it in `wrangler.jsonc`:
```json
"d1_databases": [
    {
        "binding": "PANOMARKET_DB",
        "database_name": "panomarket-db",
        "database_id": "YOUR_DATABASE_ID"
    }
]
```

3. Apply the database migrations:
```bash
npx wrangler d1 migrations apply panomarket-db
```

4. You can test the D1 database by deploying the worker:
```bash
npx wrangler deploy
```

## API Reference

Pano exposes RESTful APIs for interacting with markets:

### Market Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/markets/:market/orders` | Get the full order book for a market |
| GET | `/markets/:market/orders/:userId` | Get orders for a specific user |
| POST | `/markets/:market/orders` | Place a new order (requires order details) |
| WS | `/ws/:market` | WebSocket connection for real-time market trade updates |

### Market Management Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/markets-manage` | Get all markets (use `?active=true` to filter active markets) |
| GET | `/markets-manage/:id` | Get market details by ID |
| POST | `/markets-manage` | Create a new market (requires `name`, `buy_asset`, `sell_asset`) |
| PATCH | `/markets-manage/:id` | Update market details |
| POST | `/markets-manage/:id/status` | Update market status (active, inactive, deprecated) |

### Balance Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/balances` | Get all balances |
| GET | `/balances/:userId` | Get balances for a specific user |
| POST | `/balances/:userId` | Add balance for a user (requires `{ asset: string, amount: number }`) |
| POST | `/balances/transfer` | Transfer balance between users (requires `{ fromUserId, toUserId, asset, amount }`) |

### Trade Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/trades` | Get all trades (limited to 1000) |
| GET | `/trades/user/:userId` | Get trades for a specific user |
| GET | `/trades/order/:orderId` | Get trades for a specific order |
| GET | `/trades/market/:buyAsset/:sellAsset` | Get trades for a specific market |



Try out the API using the [Postman collection](Pano.postman_collection.json).

## Architecture

Panomarket uses Cloudflare Durable Objects to create isolated markets. Each market is a separate Durable Object instance, allowing for:

- Strong consistency within a market
- Horizontal scaling across different markets
- Protection against data races
- Optimal global routing to minimize latency

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Limitations

- Currently, the API is not secured. Anyone can create a market and place orders for anyone. Add user authentication to the API to prevent this.
- Durable Objects are used for both write and read operations. Since Durable Objects are single-threaded, order reads may block order writes and slow down order execution. Similarly for balance updates.

## Future Work

- Stream trades to clients via websockets
- Split sell and buy orderbooks into separate Durable Objects to effectively double the rate of orders that can be processed per second
- Persist orders and balances to D1 databases for reads
- Offload finished orders to conserve Durable Object storage
- Add user authentication options to the API
- Add ip/user rate limiting to the API

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers directly. 
