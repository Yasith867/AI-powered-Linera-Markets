import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from "@neondatabase/serverless";

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
    const { marketId, optionIndex, amount, type, trader } = req.body;

    if (!marketId || optionIndex === undefined || !amount || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get current market
    const markets = await sql`SELECT * FROM markets WHERE id = ${marketId}`;
    if (markets.length === 0) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const market = markets[0];
    const odds = [...market.odds];
    const k = 0.1; // AMM constant

    // Update odds based on trade
    if (type === 'buy') {
      odds[optionIndex] = Math.min(0.99, odds[optionIndex] + k * amount / 100);
    } else {
      odds[optionIndex] = Math.max(0.01, odds[optionIndex] - k * amount / 100);
    }

    // Normalize odds
    const total = odds.reduce((a, b) => a + b, 0);
    const normalizedOdds = odds.map(o => o / total);

    // Update market
    await sql`
      UPDATE markets 
      SET odds = ${JSON.stringify(normalizedOdds)}, 
          total_volume = total_volume + ${amount}
      WHERE id = ${marketId}
    `;

    // Record trade
    const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    await sql`
      INSERT INTO trades (market_id, trader, option_index, amount, type, odds_at_trade, tx_hash)
      VALUES (${marketId}, ${trader || 'anonymous'}, ${optionIndex}, ${amount}, ${type}, ${odds[optionIndex]}, ${txHash})
    `;

    return res.json({ 
      success: true, 
      newOdds: normalizedOdds,
      txHash 
    });
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message || "Failed to execute trade" });
  }
}
