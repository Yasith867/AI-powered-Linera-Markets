import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from "@neondatabase/serverless";

const APP_ID = process.env.LINERA_APP_ID || process.env.VITE_LINERA_APP_ID || '';
const CHAIN_ID = process.env.LINERA_CHAIN_ID || process.env.VITE_LINERA_CHAIN_ID || '';

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

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { title, description, category, options, eventTime } = req.body;
    const initialOdds = options.map(() => 1 / options.length);
    const chainId = `${CHAIN_ID}_prediction-market_${Date.now()}`;
    const txHash = `0x${APP_ID.slice(0, 8)}${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    
    let resolveTime = eventTime ? new Date(eventTime) : new Date();
    if (!eventTime) {
      resolveTime.setDate(resolveTime.getDate() + 4);
    }
    
    const result = await sql`
      INSERT INTO markets (title, description, category, options, odds, event_time, linera_chain_id)
      VALUES (${title}, ${description}, ${category}, ${JSON.stringify(options)}, ${JSON.stringify(initialOdds)}, ${resolveTime.toISOString()}, ${chainId})
      RETURNING *
    `;
    
    await sql`
      INSERT INTO market_events (market_id, event_type, data)
      VALUES (${result[0].id}, 'market_created', ${JSON.stringify({ title, options, lineraChainId: chainId, txHash })})
    `;
    
    return res.status(201).json({ ...result[0], txHash });
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message || "Failed to create market" });
  }
}
