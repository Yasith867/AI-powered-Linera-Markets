import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../_db';
import { markets, trades, marketEvents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import * as lineraClient from '../../_linera';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const marketId = parseInt(id as string);

  try {
    const startTime = performance.now();
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

    res.json({ 
      trade, 
      newOdds, 
      lineraLatencyMs: contractResult.latencyMs,
      txHash: contractResult.txHash,
      totalLatencyMs: totalLatency,
    });
  } catch (error) {
    console.error("Error executing trade:", error);
    res.status(500).json({ error: "Failed to execute trade" });
  }
}
