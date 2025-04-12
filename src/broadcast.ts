import { DurableObject } from "cloudflare:workers";
import { Trade } from "./types";

export class TradeBroadcaster extends DurableObject {
  clients: Map<string, WebSocket> = new Map();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(req: Request) {
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

    const [clientWs, serverWs] = new WebSocketPair() as [WebSocket, WebSocket];
    const id = crypto.randomUUID();

    this.clients.set(id, serverWs);

    serverWs.accept();

    serverWs.addEventListener("close", () => {
      this.clients.delete(id);
    });

    return new Response(null, {
      status: 101,
      webSocket: clientWs,
    });
  }

  // Called externally to push trade updates
  async broadcastTrades(tradeData: Trade[]) {
    const msg = JSON.stringify(tradeData);

    for (const ws of this.clients.values()) {
      try {
        ws.send(msg);
      } catch {
        // Handle stale socket
      }
    }
  }
}
