import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_db';
import { markets, trades, oracleNodes, tradingBots } from '../../shared/schema';
import { sql, count } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const [marketStats] = await db
      .select({
        total: count(),
        active: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
        resolved: sql<number>`COUNT(CASE WHEN status = 'resolved' THEN 1 END)`,
        totalVolume: sql<number>`COALESCE(SUM(total_volume), 0)`,
      })
      .from(markets);

    const [tradeStats] = await db
      .select({
        total: count(),
        totalValue: sql<number>`COALESCE(SUM(amount), 0)`,
      })
      .from(trades);

    const [oracleStats] = await db
      .select({
        total: count(),
        active: sql<number>`COUNT(CASE WHEN is_active = true THEN 1 END)`,
      })
      .from(oracleNodes);

    const [botStats] = await db
      .select({
        total: count(),
        active: sql<number>`COUNT(CASE WHEN is_active = true THEN 1 END)`,
        totalTrades: sql<number>`COALESCE(SUM(total_trades), 0)`,
      })
      .from(tradingBots);

    res.json({
      markets: {
        total: Number(marketStats?.total) || 0,
        active: Number(marketStats?.active) || 0,
        resolved: Number(marketStats?.resolved) || 0,
        totalVolume: Number(marketStats?.totalVolume) || 0,
      },
      trades: {
        total: Number(tradeStats?.total) || 0,
        totalValue: Number(tradeStats?.totalValue) || 0,
      },
      oracles: {
        total: Number(oracleStats?.total) || 0,
        active: Number(oracleStats?.active) || 0,
        totalVotes: 0,
      },
      bots: {
        total: Number(botStats?.total) || 0,
        active: Number(botStats?.active) || 0,
        totalTrades: Number(botStats?.totalTrades) || 0,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
}
