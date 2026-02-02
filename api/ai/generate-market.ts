import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { db } from '../_db';
import { markets, marketEvents } from '../../shared/schema';

const useCloudflare = !!process.env.CLOUDFLARE_API_KEY;

const openai = new OpenAI({
  apiKey: useCloudflare 
    ? process.env.CLOUDFLARE_API_KEY 
    : process.env.OPENAI_API_KEY,
  baseURL: useCloudflare 
    ? `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`
    : undefined,
});

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
    const { category, context } = req.body;

    const response = await openai.chat.completions.create({
      model: useCloudflare ? "@cf/meta/llama-3.1-8b-instruct" : "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI agent that creates prediction markets for the Linera blockchain. 
Generate engaging, timely prediction markets based on current events. 
Return valid JSON with the following structure:
{
  "title": "Clear question format ending with ?",
  "description": "Brief context about the event and why it matters",
  "category": "sports|crypto|politics|entertainment|technology",
  "options": ["Option A", "Option B", ...],
  "daysUntilResolution": 4
}
IMPORTANT: Markets should resolve within 4-5 days from creation. Set daysUntilResolution between 3 and 5.
Focus on markets that:
- Have clear binary or multiple-choice outcomes
- Can be objectively verified
- Are time-bound with clear resolution criteria
- Are engaging and newsworthy`,
        },
        {
          role: "user",
          content: `Create a prediction market for category: ${category || "general"}. ${context ? `Context: ${context}` : ""}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const marketData = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    const initialOdds = marketData.options.map(() => 1 / marketData.options.length);
    
    const daysUntilResolution = marketData.daysUntilResolution || 4;
    const eventTime = new Date();
    eventTime.setDate(eventTime.getDate() + daysUntilResolution);
    
    const [market] = await db.insert(markets).values({
      title: marketData.title,
      description: marketData.description,
      category: marketData.category || category || "general",
      options: marketData.options,
      odds: initialOdds,
      eventTime: eventTime,
      createdBy: "ai_agent",
    }).returning();

    await db.insert(marketEvents).values({
      marketId: market.id,
      eventType: "ai_market_created",
      data: { prompt: context, category },
    });

    res.json(market);
  } catch (error) {
    console.error("Error generating AI market:", error);
    res.status(500).json({ error: "Failed to generate market" });
  }
}
