import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { marketRoutes, setBroadcast as setMarketBroadcast } from "./routes/markets";
import { oracleRoutes, setBroadcast as setOracleBroadcast } from "./routes/oracles";
import { botRoutes, setBroadcast as setBotBroadcast } from "./routes/bots";
import { aiRoutes, setBroadcast as setAiBroadcast } from "./routes/ai";
import { analyticsRoutes } from "./routes/analytics";
import { lineraRoutes } from "./routes/linera";
import * as lineraClient from "./linera/client";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("WebSocket client connected");

  ws.on("close", () => {
    clients.delete(ws);
    console.log("WebSocket client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    clients.delete(ws);
  });
});

function broadcast(event: { type: string; data: unknown }) {
  const message = JSON.stringify(event);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

setMarketBroadcast(broadcast);
setOracleBroadcast(broadcast);
setBotBroadcast(broadcast);
setAiBroadcast(broadcast);

app.use("/api/markets", marketRoutes);
app.use("/api/oracles", oracleRoutes);
app.use("/api/bots", botRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/linera", lineraRoutes);

app.get("/api/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/linera-stats", (_, res) => {
  res.json(lineraClient.getLineraStats());
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
