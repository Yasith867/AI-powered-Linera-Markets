import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_db';
import { oracleNodes } from '../../shared/schema';
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
      const allOracles = await db.select().from(oracleNodes).orderBy(desc(oracleNodes.createdAt));
      return res.json(allOracles);
    }

    if (req.method === 'POST') {
      const { name, dataSource } = req.body;
      
      const [oracle] = await db.insert(oracleNodes).values({
        name,
        dataSource: dataSource || "api",
        accuracy: 100,
        totalVotes: 0,
        isActive: true,
      }).returning();

      return res.status(201).json(oracle);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
}
