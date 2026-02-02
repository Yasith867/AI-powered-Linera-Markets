import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Market ID required' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const markets = await sql`SELECT * FROM markets WHERE id = ${id}`;
    
    if (markets.length === 0) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const m = markets[0];
    const transformed = {
      id: m.id,
      lineraChainId: m.linera_chain_id,
      title: m.title,
      description: m.description,
      category: m.category,
      options: m.options,
      odds: m.odds,
      totalVolume: m.total_volume,
      liquidity: m.liquidity,
      status: m.status,
      resolvedOutcome: m.resolved_outcome,
      eventTime: m.event_time,
      createdBy: m.created_by,
      createdAt: m.created_at,
      resolvedAt: m.resolved_at,
    };
    
    return res.json(transformed);
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch market" });
  }
}
