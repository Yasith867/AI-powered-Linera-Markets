import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_db';
import { markets, marketEvents } from '../../shared/schema';
import { desc } from 'drizzle-orm';
import * as lineraClient from '../_linera';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const allMarkets = await db.select().from(markets).orderBy(desc(markets.createdAt));
      return res.json(allMarkets);
    }

    if (req.method === 'POST') {
      const startTime = performance.now();
      const { title, description, category, options, eventTime } = req.body;
      const initialOdds = options.map(() => 1 / options.length);
      
      const chain = await lineraClient.createMicrochain("prediction-market");
      
      const contractResult = await lineraClient.invokeMarketContract(
        chain.chainId,
        "CreateMarket",
        { title, description, options, eventTime }
      );
      
      let resolveTime = eventTime ? new Date(eventTime) : new Date();
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
        lineraChainId: chain.chainId,
      }).returning();

      await db.insert(marketEvents).values({
        marketId: market.id,
        eventType: "market_created",
        data: { title, options, lineraChainId: chain.chainId, txHash: contractResult.txHash },
      });

      const totalLatency = performance.now() - startTime;
      
      return res.status(201).json({ 
        ...market, 
        lineraLatencyMs: contractResult.latencyMs,
        txHash: contractResult.txHash,
        totalLatencyMs: totalLatency,
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
}
