import { Router } from "express";
import { db } from "../db";
import { markets, trades, oracleVotes, marketEvents } from "../../shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import * as lineraClient from "../linera/client";

let broadcastFn: ((event: { type: string; data: unknown }) => void) | null = null;
export function setBroadcast(fn: (event: { type: string; data: unknown }) => void) {
  broadcastFn = fn;
}
function broadcast(event: { type: string; data: unknown }) {
  if (broadcastFn) broadcastFn(event);
}

export const marketRoutes = Router();

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
    
    const chain = await lineraClient.createMicrochain("prediction-market");
    
    const contractResult = await lineraClient.invokeMarketContract(
      chain.chainId,
      "CreateMarket",
      { title, description, options, eventTime }
    );
    
    const [market] = await db.insert(markets).values({
      title,
      description,
      category,
      options,
      odds: initialOdds,
      eventTime: eventTime ? new Date(eventTime) : null,
      lineraChainId: chain.chainId,
    }).returning();

    await db.insert(marketEvents).values({
      marketId: market.id,
      eventType: "market_created",
      data: { title, options, lineraChainId: chain.chainId, txHash: contractResult.txHash },
    });

    const totalLatency = performance.now() - startTime;
    
    broadcast({ 
      type: "market_created", 
      data: { 
        ...market, 
        lineraLatencyMs: contractResult.latencyMs,
        totalLatencyMs: totalLatency,
      } 
    });
    res.status(201).json({ 
      ...market, 
      lineraLatencyMs: contractResult.latencyMs,
      txHash: contractResult.txHash,
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

    const currentOdds = market.odds as number[];
    const price = currentOdds[optionIndex];

    const contractResult = await lineraClient.invokeMarketContract(
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
      isBuy,
    }).returning();

    const newOdds = updateOdds(currentOdds, optionIndex, amount, isBuy, market.liquidity);
    const newVolume = market.totalVolume + amount;

    await db.update(markets).set({
      odds: newOdds,
      totalVolume: newVolume,
    }).where(eq(markets.id, marketId));

    await db.insert(marketEvents).values({
      marketId,
      eventType: "trade",
      data: { traderAddress, optionIndex, amount, isBuy, price, txHash: contractResult.txHash },
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
        totalLatencyMs: totalLatency,
      } 
    });
    res.json({ 
      trade, 
      newOdds, 
      lineraLatencyMs: contractResult.latencyMs,
      txHash: contractResult.txHash,
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
      resolvedAt: new Date(),
    }).where(eq(markets.id, marketId)).returning();

    const winningTrades = await db.select().from(trades)
      .where(eq(trades.marketId, marketId));

    for (const trade of winningTrades) {
      if (trade.optionIndex === outcome && trade.isBuy) {
        const payout = trade.amount / trade.price;
        await db.update(trades).set({ payout }).where(eq(trades.id, trade.id));
      }
    }

    await db.insert(marketEvents).values({
      marketId,
      eventType: "market_resolved",
      data: { outcome },
    });

    broadcast({ type: "market_resolved", data: { marketId, outcome } });
    res.json(market);
  } catch (error) {
    console.error("Error resolving market:", error);
    res.status(500).json({ error: "Failed to resolve market" });
  }
});

function updateOdds(
  currentOdds: number[],
  optionIndex: number,
  amount: number,
  isBuy: boolean,
  liquidity: number
): number[] {
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
