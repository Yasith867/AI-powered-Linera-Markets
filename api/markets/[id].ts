import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_db';
import { markets, trades, oracleVotes } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  const marketId = parseInt(id as string);

  try {
    if (req.method === 'GET') {
      const [market] = await db.select().from(markets).where(eq(markets.id, marketId));
      if (!market) {
        return res.status(404).json({ error: "Market not found" });
      }
      const marketTrades = await db.select().from(trades).where(eq(trades.marketId, marketId)).orderBy(desc(trades.createdAt));
      const votes = await db.select().from(oracleVotes).where(eq(oracleVotes.marketId, marketId));
      return res.json({ ...market, trades: marketTrades, votes });
    }

    if (req.method === 'DELETE') {
      await db.delete(markets).where(eq(markets.id, marketId));
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
}
