import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_db';
import { tradingBots } from '../../shared/schema';
import { desc } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const allBots = await db.select().from(tradingBots).orderBy(desc(tradingBots.createdAt));
      return res.json(allBots);
    }

    if (req.method === 'POST') {
      const { name, strategy, ownerAddress } = req.body;
      
      const [bot] = await db.insert(tradingBots).values({
        name,
        strategy,
        ownerAddress,
        totalTrades: 0,
        profitLoss: 0,
        isActive: true,
      }).returning();

      return res.status(201).json(bot);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
}
