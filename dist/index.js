var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

// server/routes/markets.ts
import { Router } from "express";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  conversations: () => conversations,
  insertConversationSchema: () => insertConversationSchema,
  insertMarketEventSchema: () => insertMarketEventSchema,
  insertMarketSchema: () => insertMarketSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertOracleNodeSchema: () => insertOracleNodeSchema,
  insertOracleVoteSchema: () => insertOracleVoteSchema,
  insertTradeSchema: () => insertTradeSchema,
  insertTradingBotSchema: () => insertTradingBotSchema,
  marketEvents: () => marketEvents,
  markets: () => markets,
  messages: () => messages,
  oracleNodes: () => oracleNodes,
  oracleVotes: () => oracleVotes,
  trades: () => trades,
  tradingBots: () => tradingBots
});
import { pgTable, serial, integer, text, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
var conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var markets = pgTable("markets", {
  id: serial("id").primaryKey(),
  lineraChainId: text("linera_chain_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  options: jsonb("options").$type().notNull(),
  odds: jsonb("odds").$type().notNull(),
  totalVolume: real("total_volume").default(0).notNull(),
  liquidity: real("liquidity").default(1e3).notNull(),
  status: text("status").default("active").notNull(),
  resolvedOutcome: integer("resolved_outcome"),
  eventTime: timestamp("event_time"),
  createdBy: text("created_by").default("ai_agent").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  resolvedAt: timestamp("resolved_at")
});
var oracleNodes = pgTable("oracle_nodes", {
  id: serial("id").primaryKey(),
  lineraChainId: text("linera_chain_id"),
  name: text("name").notNull(),
  dataSource: text("data_source").notNull(),
  accuracy: real("accuracy").default(100).notNull(),
  totalVotes: integer("total_votes").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var oracleVotes = pgTable("oracle_votes", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  oracleId: integer("oracle_id").notNull().references(() => oracleNodes.id, { onDelete: "cascade" }),
  vote: integer("vote").notNull(),
  confidence: real("confidence").default(1).notNull(),
  dataHash: text("data_hash"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  traderAddress: text("trader_address").notNull(),
  optionIndex: integer("option_index").notNull(),
  amount: real("amount").notNull(),
  price: real("price").notNull(),
  isBuy: boolean("is_buy").default(true).notNull(),
  payout: real("payout"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var tradingBots = pgTable("trading_bots", {
  id: serial("id").primaryKey(),
  lineraChainId: text("linera_chain_id"),
  name: text("name").notNull(),
  ownerAddress: text("owner_address").notNull(),
  strategy: text("strategy").notNull(),
  config: jsonb("config").$type().default({}).notNull(),
  totalTrades: integer("total_trades").default(0).notNull(),
  profitLoss: real("profit_loss").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var marketEvents = pgTable("market_events", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").references(() => markets.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  data: jsonb("data").$type().default({}).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
var insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
var insertMarketSchema = createInsertSchema(markets).omit({ id: true, createdAt: true, resolvedAt: true });
var insertOracleNodeSchema = createInsertSchema(oracleNodes).omit({ id: true, createdAt: true });
var insertOracleVoteSchema = createInsertSchema(oracleVotes).omit({ id: true, createdAt: true });
var insertTradeSchema = createInsertSchema(trades).omit({ id: true, createdAt: true });
var insertTradingBotSchema = createInsertSchema(tradingBots).omit({ id: true, createdAt: true });
var insertMarketEventSchema = createInsertSchema(marketEvents).omit({ id: true, createdAt: true });

// server/db.ts
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/routes/markets.ts
import { eq, desc } from "drizzle-orm";

// server/linera/client.ts
var pendingMessages = [];
var chains = /* @__PURE__ */ new Map();
var transactions = [];
function generateChainId() {
  return `chain_${Math.random().toString(36).slice(2, 10)}`;
}
async function createMicrochain(applicationId) {
  const startTime = performance.now();
  const chain = {
    chainId: generateChainId(),
    applicationId,
    blockHeight: 0
  };
  chains.set(chain.chainId, chain);
  const latency = performance.now() - startTime;
  transactions.push({
    txHash: `tx_${Math.random().toString(36).slice(2, 12)}`,
    chainId: chain.chainId,
    operation: "CREATE_CHAIN",
    timestamp: Date.now(),
    latencyMs: latency
  });
  return chain;
}
async function executeOperation(chainId, operation, data) {
  const startTime = performance.now();
  const chain = chains.get(chainId);
  if (chain) {
    chain.blockHeight += 1;
    chains.set(chainId, chain);
  }
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 50 + 10));
  const latency = performance.now() - startTime;
  const txHash = `tx_${Math.random().toString(36).slice(2, 12)}`;
  transactions.push({
    txHash,
    chainId,
    operation,
    timestamp: Date.now(),
    latencyMs: latency
  });
  return { success: true, txHash, latencyMs: latency };
}
async function sendCrossChainMessage(sourceChain, targetChain, messageType, data) {
  const message = {
    sourceChain,
    targetChain,
    messageType,
    data,
    delivered: false
  };
  pendingMessages.push(message);
  setTimeout(() => {
    message.delivered = true;
    processCrossChainMessage(message);
  }, Math.random() * 100 + 50);
}
async function processCrossChainMessage(message) {
  console.log(`[Linera] Cross-chain message delivered: ${message.messageType} from ${message.sourceChain} to ${message.targetChain}`);
}
function getAverageLatency() {
  if (transactions.length === 0) return 0;
  const total = transactions.reduce((sum2, tx) => sum2 + tx.latencyMs, 0);
  return total / transactions.length;
}
function getTransactionCount() {
  return transactions.length;
}
function getPendingMessages() {
  return pendingMessages.filter((m) => !m.delivered);
}
function getChainCount() {
  return chains.size;
}
function getRecentTransactions(limit = 10) {
  return transactions.slice(-limit);
}
async function invokeMarketContract(marketChainId, operation, data) {
  return executeOperation(marketChainId, `Market::${operation}`, data);
}
function getLineraStats() {
  return {
    totalChains: getChainCount(),
    totalTransactions: getTransactionCount(),
    averageLatencyMs: getAverageLatency().toFixed(2),
    pendingMessages: getPendingMessages().length,
    recentTransactions: getRecentTransactions(5),
    isConnected: true,
    network: "testnet-conway"
  };
}

// server/routes/markets.ts
var broadcastFn = null;
function setBroadcast(fn) {
  broadcastFn = fn;
}
function broadcast(event) {
  if (broadcastFn) broadcastFn(event);
}
var marketRoutes = Router();
marketRoutes.get("/", async (_, res) => {
  try {
    const allMarkets = await db.select().from(markets).orderBy(desc(markets.createdAt));
    res.json(allMarkets);
  } catch (error) {
    console.error("Error fetching markets:", error);
    res.status(500).json({ error: "Failed to fetch markets" });
  }
});
marketRoutes.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [market] = await db.select().from(markets).where(eq(markets.id, id));
    if (!market) {
      return res.status(404).json({ error: "Market not found" });
    }
    const marketTrades = await db.select().from(trades).where(eq(trades.marketId, id)).orderBy(desc(trades.createdAt));
    const votes = await db.select().from(oracleVotes).where(eq(oracleVotes.marketId, id));
    res.json({ ...market, trades: marketTrades, votes });
  } catch (error) {
    console.error("Error fetching market:", error);
    res.status(500).json({ error: "Failed to fetch market" });
  }
});
marketRoutes.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(markets).where(eq(markets.id, id));
    broadcast({ type: "market_deleted", data: { marketId: id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting market:", error);
    res.status(500).json({ error: "Failed to delete market" });
  }
});
marketRoutes.post("/", async (req, res) => {
  try {
    const startTime = performance.now();
    const { title, description, category, options, eventTime } = req.body;
    const initialOdds = options.map(() => 1 / options.length);
    const chain = await createMicrochain("prediction-market");
    const contractResult = await invokeMarketContract(
      chain.chainId,
      "CreateMarket",
      { title, description, options, eventTime }
    );
    let resolveTime = eventTime ? new Date(eventTime) : /* @__PURE__ */ new Date();
    if (!eventTime) {
      resolveTime.setDate(resolveTime.getDate() + 4);
    }
    const [market] = await db.insert(markets).values({
      title,
      description,
      category,
      options,
      odds: initialOdds,
      eventTime: resolveTime,
      lineraChainId: chain.chainId
    }).returning();
    await db.insert(marketEvents).values({
      marketId: market.id,
      eventType: "market_created",
      data: { title, options, lineraChainId: chain.chainId, txHash: contractResult.txHash }
    });
    const totalLatency = performance.now() - startTime;
    broadcast({
      type: "market_created",
      data: {
        ...market,
        lineraLatencyMs: contractResult.latencyMs,
        totalLatencyMs: totalLatency
      }
    });
    res.status(201).json({
      ...market,
      lineraLatencyMs: contractResult.latencyMs,
      txHash: contractResult.txHash
    });
  } catch (error) {
    console.error("Error creating market:", error);
    res.status(500).json({ error: "Failed to create market" });
  }
});
marketRoutes.post("/:id/trade", async (req, res) => {
  try {
    const startTime = performance.now();
    const marketId = parseInt(req.params.id);
    const { traderAddress, optionIndex, amount, isBuy } = req.body;
    const [market] = await db.select().from(markets).where(eq(markets.id, marketId));
    if (!market || market.status !== "active") {
      return res.status(400).json({ error: "Market not available for trading" });
    }
    const currentOdds = market.odds;
    const price = currentOdds[optionIndex];
    const contractResult = await invokeMarketContract(
      market.lineraChainId || `chain_${marketId}`,
      "PlaceTrade",
      { optionIndex, amount, isBuy, traderAddress }
    );
    const [trade] = await db.insert(trades).values({
      marketId,
      traderAddress,
      optionIndex,
      amount,
      price,
      isBuy
    }).returning();
    const newOdds = updateOdds(currentOdds, optionIndex, amount, isBuy, market.liquidity);
    const newVolume = market.totalVolume + amount;
    await db.update(markets).set({
      odds: newOdds,
      totalVolume: newVolume
    }).where(eq(markets.id, marketId));
    await db.insert(marketEvents).values({
      marketId,
      eventType: "trade",
      data: { traderAddress, optionIndex, amount, isBuy, price, txHash: contractResult.txHash }
    });
    const totalLatency = performance.now() - startTime;
    broadcast({
      type: "trade",
      data: {
        marketId,
        trade,
        newOdds,
        newVolume,
        lineraLatencyMs: contractResult.latencyMs,
        totalLatencyMs: totalLatency
      }
    });
    res.json({
      trade,
      newOdds,
      lineraLatencyMs: contractResult.latencyMs,
      txHash: contractResult.txHash
    });
  } catch (error) {
    console.error("Error executing trade:", error);
    res.status(500).json({ error: "Failed to execute trade" });
  }
});
marketRoutes.post("/:id/resolve", async (req, res) => {
  try {
    const marketId = parseInt(req.params.id);
    const { outcome } = req.body;
    const [market] = await db.update(markets).set({
      status: "resolved",
      resolvedOutcome: outcome,
      resolvedAt: /* @__PURE__ */ new Date()
    }).where(eq(markets.id, marketId)).returning();
    const winningTrades = await db.select().from(trades).where(eq(trades.marketId, marketId));
    for (const trade of winningTrades) {
      if (trade.optionIndex === outcome && trade.isBuy) {
        const payout = trade.amount / trade.price;
        await db.update(trades).set({ payout }).where(eq(trades.id, trade.id));
      }
    }
    await db.insert(marketEvents).values({
      marketId,
      eventType: "market_resolved",
      data: { outcome }
    });
    broadcast({ type: "market_resolved", data: { marketId, outcome } });
    res.json(market);
  } catch (error) {
    console.error("Error resolving market:", error);
    res.status(500).json({ error: "Failed to resolve market" });
  }
});
function updateOdds(currentOdds, optionIndex, amount, isBuy, liquidity) {
  const impact = amount / (liquidity * 10);
  const newOdds = [...currentOdds];
  if (isBuy) {
    newOdds[optionIndex] = Math.min(0.99, newOdds[optionIndex] + impact);
    const reduction = impact / (newOdds.length - 1);
    for (let i = 0; i < newOdds.length; i++) {
      if (i !== optionIndex) {
        newOdds[i] = Math.max(0.01, newOdds[i] - reduction);
      }
    }
  } else {
    newOdds[optionIndex] = Math.max(0.01, newOdds[optionIndex] - impact);
    const increase = impact / (newOdds.length - 1);
    for (let i = 0; i < newOdds.length; i++) {
      if (i !== optionIndex) {
        newOdds[i] = Math.min(0.99, newOdds[i] + increase);
      }
    }
  }
  const total = newOdds.reduce((a, b) => a + b, 0);
  return newOdds.map((o) => o / total);
}

// server/routes/oracles.ts
import { Router as Router2 } from "express";
import { eq as eq2, desc as desc2, and, sql as sql3 } from "drizzle-orm";
var broadcastFn2 = null;
function setBroadcast2(fn) {
  broadcastFn2 = fn;
}
function broadcast2(event) {
  if (broadcastFn2) broadcastFn2(event);
}
var oracleRoutes = Router2();
oracleRoutes.get("/", async (_, res) => {
  try {
    const oracles = await db.select().from(oracleNodes).orderBy(desc2(oracleNodes.createdAt));
    res.json(oracles);
  } catch (error) {
    console.error("Error fetching oracles:", error);
    res.status(500).json({ error: "Failed to fetch oracles" });
  }
});
oracleRoutes.post("/", async (req, res) => {
  try {
    const { name, dataSource, lineraChainId } = req.body;
    const [oracle] = await db.insert(oracleNodes).values({
      name,
      dataSource,
      lineraChainId
    }).returning();
    broadcast2({ type: "oracle_created", data: oracle });
    res.status(201).json(oracle);
  } catch (error) {
    console.error("Error creating oracle:", error);
    res.status(500).json({ error: "Failed to create oracle" });
  }
});
oracleRoutes.post("/:id/vote", async (req, res) => {
  try {
    const oracleId = parseInt(req.params.id);
    const { marketId, vote, confidence, dataHash } = req.body;
    const existingVote = await db.select().from(oracleVotes).where(and(
      eq2(oracleVotes.oracleId, oracleId),
      eq2(oracleVotes.marketId, marketId)
    ));
    if (existingVote.length > 0) {
      return res.status(400).json({ error: "Oracle has already voted on this market" });
    }
    const [newVote] = await db.insert(oracleVotes).values({
      oracleId,
      marketId,
      vote,
      confidence,
      dataHash
    }).returning();
    await db.update(oracleNodes).set({
      totalVotes: sql3`${oracleNodes.totalVotes} + 1`
    }).where(eq2(oracleNodes.id, oracleId));
    await db.insert(marketEvents).values({
      marketId,
      eventType: "oracle_vote",
      data: { oracleId, vote, confidence }
    });
    broadcast2({ type: "oracle_vote", data: { oracleId, marketId, vote, confidence } });
    const allVotes = await db.select().from(oracleVotes).where(eq2(oracleVotes.marketId, marketId));
    if (allVotes.length >= 3) {
      const consensus = checkConsensus(allVotes);
      if (consensus.hasConsensus) {
        await resolveMarketByConsensus(marketId, consensus.outcome);
      }
    }
    res.json(newVote);
  } catch (error) {
    console.error("Error submitting oracle vote:", error);
    res.status(500).json({ error: "Failed to submit oracle vote" });
  }
});
oracleRoutes.get("/votes/:marketId", async (req, res) => {
  try {
    const marketId = parseInt(req.params.marketId);
    const votes = await db.select({
      vote: oracleVotes,
      oracle: oracleNodes
    }).from(oracleVotes).innerJoin(oracleNodes, eq2(oracleVotes.oracleId, oracleNodes.id)).where(eq2(oracleVotes.marketId, marketId));
    res.json(votes);
  } catch (error) {
    console.error("Error fetching oracle votes:", error);
    res.status(500).json({ error: "Failed to fetch oracle votes" });
  }
});
function checkConsensus(votes) {
  const voteCounts = {};
  for (const v of votes) {
    voteCounts[v.vote] = (voteCounts[v.vote] || 0) + v.confidence;
  }
  const totalWeight = Object.values(voteCounts).reduce((a, b) => a + b, 0);
  for (const [outcome, weight] of Object.entries(voteCounts)) {
    if (weight / totalWeight >= 0.67) {
      return { hasConsensus: true, outcome: parseInt(outcome) };
    }
  }
  return { hasConsensus: false };
}
async function resolveMarketByConsensus(marketId, outcome) {
  await db.update(markets).set({
    status: "resolved",
    resolvedOutcome: outcome,
    resolvedAt: /* @__PURE__ */ new Date()
  }).where(eq2(markets.id, marketId));
  await db.insert(marketEvents).values({
    marketId,
    eventType: "market_resolved_by_consensus",
    data: { outcome }
  });
  broadcast2({ type: "market_resolved", data: { marketId, outcome, method: "consensus" } });
}

// server/routes/bots.ts
import { Router as Router3 } from "express";
import { eq as eq3, desc as desc3, sql as sql4 } from "drizzle-orm";
var broadcastFn3 = null;
function setBroadcast3(fn) {
  broadcastFn3 = fn;
}
function broadcast3(event) {
  if (broadcastFn3) broadcastFn3(event);
}
var botRoutes = Router3();
botRoutes.get("/", async (_, res) => {
  try {
    const bots = await db.select().from(tradingBots).orderBy(desc3(tradingBots.createdAt));
    res.json(bots);
  } catch (error) {
    console.error("Error fetching bots:", error);
    res.status(500).json({ error: "Failed to fetch bots" });
  }
});
botRoutes.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [bot] = await db.select().from(tradingBots).where(eq3(tradingBots.id, id));
    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }
    const botTrades = await db.select().from(trades).where(eq3(trades.traderAddress, `bot_${id}`)).orderBy(desc3(trades.createdAt));
    res.json({ ...bot, trades: botTrades });
  } catch (error) {
    console.error("Error fetching bot:", error);
    res.status(500).json({ error: "Failed to fetch bot" });
  }
});
botRoutes.post("/", async (req, res) => {
  try {
    const { name, ownerAddress, strategy, config, lineraChainId } = req.body;
    const [bot] = await db.insert(tradingBots).values({
      name,
      ownerAddress,
      strategy,
      config: config || {},
      lineraChainId
    }).returning();
    broadcast3({ type: "bot_created", data: bot });
    res.status(201).json(bot);
  } catch (error) {
    console.error("Error creating bot:", error);
    res.status(500).json({ error: "Failed to create bot" });
  }
});
botRoutes.post("/:id/execute", async (req, res) => {
  try {
    const botId = parseInt(req.params.id);
    const [bot] = await db.select().from(tradingBots).where(eq3(tradingBots.id, botId));
    if (!bot || !bot.isActive) {
      return res.status(400).json({ error: "Bot not available" });
    }
    const activeMarkets = await db.select().from(markets).where(eq3(markets.status, "active"));
    const tradeDecisions = await executeStrategy(bot, activeMarkets);
    for (const decision of tradeDecisions) {
      const [market] = await db.select().from(markets).where(eq3(markets.id, decision.marketId));
      if (!market) continue;
      const currentOdds = market.odds;
      const price = currentOdds[decision.optionIndex];
      await db.insert(trades).values({
        marketId: decision.marketId,
        traderAddress: `bot_${botId}`,
        optionIndex: decision.optionIndex,
        amount: decision.amount,
        price,
        isBuy: decision.isBuy
      });
      await db.update(tradingBots).set({
        totalTrades: sql4`${tradingBots.totalTrades} + 1`
      }).where(eq3(tradingBots.id, botId));
    }
    broadcast3({ type: "bot_executed", data: { botId, trades: tradeDecisions.length } });
    res.json({ success: true, trades: tradeDecisions });
  } catch (error) {
    console.error("Error executing bot:", error);
    res.status(500).json({ error: "Failed to execute bot" });
  }
});
botRoutes.patch("/:id/toggle", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [bot] = await db.select().from(tradingBots).where(eq3(tradingBots.id, id));
    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }
    const [updated] = await db.update(tradingBots).set({
      isActive: !bot.isActive
    }).where(eq3(tradingBots.id, id)).returning();
    broadcast3({ type: "bot_toggled", data: updated });
    res.json(updated);
  } catch (error) {
    console.error("Error toggling bot:", error);
    res.status(500).json({ error: "Failed to toggle bot" });
  }
});
async function executeStrategy(bot, activeMarkets) {
  const decisions = [];
  const config = bot.config;
  switch (bot.strategy) {
    case "momentum":
      for (const market of activeMarkets) {
        const odds = market.odds;
        const maxOddIndex = odds.indexOf(Math.max(...odds));
        if (odds[maxOddIndex] > 0.6) {
          decisions.push({
            marketId: market.id,
            optionIndex: maxOddIndex,
            amount: config.tradeSize || 10,
            isBuy: true
          });
        }
      }
      break;
    case "contrarian":
      for (const market of activeMarkets) {
        const odds = market.odds;
        const minOddIndex = odds.indexOf(Math.min(...odds));
        if (odds[minOddIndex] < 0.3) {
          decisions.push({
            marketId: market.id,
            optionIndex: minOddIndex,
            amount: config.tradeSize || 10,
            isBuy: true
          });
        }
      }
      break;
    case "arbitrage":
      for (const market of activeMarkets) {
        const odds = market.odds;
        const totalImpliedProb = odds.reduce((a, b) => a + b, 0);
        if (totalImpliedProb < 0.95) {
          odds.forEach((odd, index) => {
            if (odd < 0.5) {
              decisions.push({
                marketId: market.id,
                optionIndex: index,
                amount: config.tradeSize || 5,
                isBuy: true
              });
            }
          });
        }
      }
      break;
    default:
      break;
  }
  return decisions;
}

// server/routes/ai.ts
import { Router as Router4 } from "express";
import OpenAI from "openai";
var broadcastFn4 = null;
function setBroadcast4(fn) {
  broadcastFn4 = fn;
}
function broadcast4(event) {
  if (broadcastFn4) broadcastFn4(event);
}
var openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
var aiRoutes = Router4();
aiRoutes.post("/generate-market", async (req, res) => {
  try {
    const { category, context } = req.body;
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `You are an AI agent that creates prediction markets for the Linera blockchain. 
Generate engaging, timely prediction markets based on current events. 
Return valid JSON with the following structure:
{
  "title": "Clear question format ending with ?",
  "description": "Brief context about the event and why it matters",
  "category": "sports|crypto|politics|entertainment|technology",
  "options": ["Option A", "Option B", ...],
  "daysUntilResolution": 4
}
IMPORTANT: Markets should resolve within 4-5 days from creation. Set daysUntilResolution between 3 and 5.
Focus on markets that:
- Have clear binary or multiple-choice outcomes
- Can be objectively verified
- Are time-bound with clear resolution criteria
- Are engaging and newsworthy`
        },
        {
          role: "user",
          content: `Create a prediction market for category: ${category || "general"}. ${context ? `Context: ${context}` : ""}`
        }
      ],
      response_format: { type: "json_object" }
    });
    const marketData = JSON.parse(response.choices[0]?.message?.content || "{}");
    const initialOdds = marketData.options.map(() => 1 / marketData.options.length);
    const daysUntilResolution = marketData.daysUntilResolution || 4;
    const eventTime = /* @__PURE__ */ new Date();
    eventTime.setDate(eventTime.getDate() + daysUntilResolution);
    const [market] = await db.insert(markets).values({
      title: marketData.title,
      description: marketData.description,
      category: marketData.category || category || "general",
      options: marketData.options,
      odds: initialOdds,
      eventTime,
      createdBy: "ai_agent"
    }).returning();
    await db.insert(marketEvents).values({
      marketId: market.id,
      eventType: "ai_market_created",
      data: { prompt: context, category }
    });
    broadcast4({ type: "ai_market_created", data: market });
    res.json(market);
  } catch (error) {
    console.error("Error generating AI market:", error);
    res.status(500).json({ error: "Failed to generate market" });
  }
});
aiRoutes.post("/analyze-market", async (req, res) => {
  try {
    const { marketId, marketData } = req.body;
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `You are an AI analyst for prediction markets. Analyze the market data and provide insights.
Return JSON with:
{
  "analysis": "Brief market analysis",
  "sentiment": "bullish|bearish|neutral",
  "confidence": 0.0-1.0,
  "factors": ["key factor 1", "key factor 2"],
  "recommendation": "buy|sell|hold",
  "targetOption": 0 (index of recommended option if buying)
}`
        },
        {
          role: "user",
          content: `Analyze this prediction market: ${JSON.stringify(marketData)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    const analysis = JSON.parse(response.choices[0]?.message?.content || "{}");
    res.json({ marketId, ...analysis });
  } catch (error) {
    console.error("Error analyzing market:", error);
    res.status(500).json({ error: "Failed to analyze market" });
  }
});
aiRoutes.post("/fetch-events", async (req, res) => {
  try {
    const { category } = req.body;
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `You are an AI that identifies current events suitable for prediction markets.
Generate 3-5 potential market ideas based on recent news and trends.
Return JSON array:
[
  {
    "title": "Market question?",
    "description": "Why this is interesting",
    "category": "sports|crypto|politics|entertainment|technology",
    "options": ["Yes", "No"] or multiple options,
    "urgency": "high|medium|low",
    "dataSource": "where to verify outcome"
  }
]`
        },
        {
          role: "user",
          content: `Find prediction market opportunities for category: ${category || "trending"}`
        }
      ],
      response_format: { type: "json_object" }
    });
    const content = JSON.parse(response.choices[0]?.message?.content || "{}");
    const events = content.events || content.markets || [];
    res.json({ events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});
aiRoutes.post("/oracle-data", async (req, res) => {
  try {
    const { marketId, question, options } = req.body;
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `You are an oracle AI that determines the outcome of prediction market questions.
Based on publicly available information, determine the most likely correct answer.
Return JSON:
{
  "outcome": 0 (index of correct option),
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "sources": ["source1", "source2"],
  "dataHash": "hash of evidence"
}
If the outcome is uncertain or the event hasn't occurred, return confidence < 0.5.`
        },
        {
          role: "user",
          content: `Determine outcome for: "${question}" Options: ${JSON.stringify(options)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    const oracleData = JSON.parse(response.choices[0]?.message?.content || "{}");
    res.json({ marketId, ...oracleData });
  } catch (error) {
    console.error("Error getting oracle data:", error);
    res.status(500).json({ error: "Failed to get oracle data" });
  }
});

// server/routes/analytics.ts
import { Router as Router5 } from "express";
import { desc as desc4, sql as sql5, count } from "drizzle-orm";
var analyticsRoutes = Router5();
analyticsRoutes.get("/overview", async (_, res) => {
  try {
    const [marketStats] = await db.select({
      total: count(),
      active: sql5`count(*) filter (where status = 'active')`,
      resolved: sql5`count(*) filter (where status = 'resolved')`,
      totalVolume: sql5`coalesce(sum(total_volume), 0)`
    }).from(markets);
    const [tradeStats] = await db.select({
      total: count(),
      totalValue: sql5`coalesce(sum(amount), 0)`
    }).from(trades);
    const [oracleStats] = await db.select({
      total: count(),
      active: sql5`count(*) filter (where is_active = true)`,
      totalVotes: sql5`coalesce(sum(total_votes), 0)`
    }).from(oracleNodes);
    const [botStats] = await db.select({
      total: count(),
      active: sql5`count(*) filter (where is_active = true)`,
      totalTrades: sql5`coalesce(sum(total_trades), 0)`
    }).from(tradingBots);
    res.json({
      markets: marketStats,
      trades: tradeStats,
      oracles: oracleStats,
      bots: botStats
    });
  } catch (error) {
    console.error("Error fetching analytics overview:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});
analyticsRoutes.get("/volume-history", async (_, res) => {
  try {
    const history = await db.select({
      date: sql5`date_trunc('day', created_at)::date`,
      volume: sql5`sum(amount)`,
      trades: count()
    }).from(trades).groupBy(sql5`date_trunc('day', created_at)::date`).orderBy(sql5`date_trunc('day', created_at)::date`);
    res.json(history);
  } catch (error) {
    console.error("Error fetching volume history:", error);
    res.status(500).json({ error: "Failed to fetch volume history" });
  }
});
analyticsRoutes.get("/top-markets", async (_, res) => {
  try {
    const topMarkets = await db.select().from(markets).orderBy(desc4(markets.totalVolume)).limit(10);
    res.json(topMarkets);
  } catch (error) {
    console.error("Error fetching top markets:", error);
    res.status(500).json({ error: "Failed to fetch top markets" });
  }
});
analyticsRoutes.get("/oracle-performance", async (_, res) => {
  try {
    const performance2 = await db.select({
      id: oracleNodes.id,
      name: oracleNodes.name,
      accuracy: oracleNodes.accuracy,
      totalVotes: oracleNodes.totalVotes,
      dataSource: oracleNodes.dataSource
    }).from(oracleNodes).orderBy(desc4(oracleNodes.accuracy));
    res.json(performance2);
  } catch (error) {
    console.error("Error fetching oracle performance:", error);
    res.status(500).json({ error: "Failed to fetch oracle performance" });
  }
});
analyticsRoutes.get("/bot-leaderboard", async (_, res) => {
  try {
    const leaderboard = await db.select({
      id: tradingBots.id,
      name: tradingBots.name,
      strategy: tradingBots.strategy,
      totalTrades: tradingBots.totalTrades,
      profitLoss: tradingBots.profitLoss,
      isActive: tradingBots.isActive
    }).from(tradingBots).orderBy(desc4(tradingBots.profitLoss));
    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching bot leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch bot leaderboard" });
  }
});
analyticsRoutes.get("/recent-events", async (_, res) => {
  try {
    const events = await db.select().from(marketEvents).orderBy(desc4(marketEvents.createdAt)).limit(50);
    res.json(events);
  } catch (error) {
    console.error("Error fetching recent events:", error);
    res.status(500).json({ error: "Failed to fetch recent events" });
  }
});
analyticsRoutes.get("/category-breakdown", async (_, res) => {
  try {
    const breakdown = await db.select({
      category: markets.category,
      count: count(),
      volume: sql5`coalesce(sum(total_volume), 0)`
    }).from(markets).groupBy(markets.category);
    res.json(breakdown);
  } catch (error) {
    console.error("Error fetching category breakdown:", error);
    res.status(500).json({ error: "Failed to fetch category breakdown" });
  }
});

// server/routes/linera.ts
import { Router as Router6 } from "express";
var lineraRoutes = Router6();
lineraRoutes.get("/stats", async (_, res) => {
  try {
    const stats = getLineraStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to get Linera stats" });
  }
});
lineraRoutes.get("/transactions", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const transactions2 = getRecentTransactions(limit);
    res.json(transactions2);
  } catch (error) {
    res.status(500).json({ error: "Failed to get transactions" });
  }
});
lineraRoutes.post("/chain", async (req, res) => {
  try {
    const { applicationId } = req.body;
    const chain = await createMicrochain(applicationId || "default");
    res.json(chain);
  } catch (error) {
    res.status(500).json({ error: "Failed to create chain" });
  }
});
lineraRoutes.post("/message", async (req, res) => {
  try {
    const { sourceChain, targetChain, messageType, data } = req.body;
    await sendCrossChainMessage(sourceChain, targetChain, messageType, data);
    res.json({ success: true, message: "Cross-chain message sent" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// server/index.ts
import { eq as eq5, lt, and as and2, isNotNull } from "drizzle-orm";
var app = express();
var server = createServer(app);
var wss = new WebSocketServer({ server, path: "/ws" });
app.use(cors());
app.use(express.json({ limit: "50mb" }));
var clients = /* @__PURE__ */ new Set();
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
function broadcast5(event) {
  const message = JSON.stringify(event);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
setBroadcast(broadcast5);
setBroadcast2(broadcast5);
setBroadcast3(broadcast5);
setBroadcast4(broadcast5);
app.use("/api/markets", marketRoutes);
app.use("/api/oracles", oracleRoutes);
app.use("/api/bots", botRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/linera", lineraRoutes);
app.get("/api/health", (_, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/linera-stats", (_, res) => {
  res.json(getLineraStats());
});
async function checkExpiredMarkets() {
  try {
    const now = /* @__PURE__ */ new Date();
    const expiredMarkets = await db.select().from(markets).where(
      and2(
        eq5(markets.status, "active"),
        isNotNull(markets.eventTime),
        lt(markets.eventTime, now)
      )
    );
    for (const market of expiredMarkets) {
      const highestOddsIndex = market.odds.indexOf(Math.max(...market.odds));
      await db.update(markets).set({
        status: "resolved",
        resolvedOutcome: highestOddsIndex,
        resolvedAt: now
      }).where(eq5(markets.id, market.id));
      console.log(`Auto-resolved market ${market.id}: ${market.title}`);
      broadcast5({
        type: "market_resolved",
        data: { marketId: market.id, outcome: highestOddsIndex }
      });
    }
  } catch (error) {
    console.error("Error checking expired markets:", error);
  }
}
setInterval(checkExpiredMarkets, 1e4);
var PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  checkExpiredMarkets();
});
