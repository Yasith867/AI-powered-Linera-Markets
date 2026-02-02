import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { neon } from "@neondatabase/serverless";

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
    const sql = neon(process.env.DATABASE_URL!);
    const { category, context } = req.body;

    const response = await openai.chat.completions.create({
      model: useCloudflare ? "@cf/meta/llama-3-8b-instruct" : "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI that creates prediction markets. Return valid JSON:
{
  "title": "Question ending with ?",
  "description": "Brief context",
  "category": "sports|crypto|politics|technology",
  "options": ["Option A", "Option B"],
  "daysUntilResolution": 4
}`,
        },
        {
          role: "user",
          content: `Create a prediction market for: ${category || "general"}. ${context || ""}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const marketData = JSON.parse(response.choices[0]?.message?.content || "{}");
    const initialOdds = marketData.options.map(() => 1 / marketData.options.length);
    const eventTime = new Date();
    eventTime.setDate(eventTime.getDate() + (marketData.daysUntilResolution || 4));
    
    const result = await sql`
      INSERT INTO markets (title, description, category, options, odds, event_time, created_by)
      VALUES (${marketData.title}, ${marketData.description}, ${marketData.category || category || "general"}, ${JSON.stringify(marketData.options)}, ${JSON.stringify(initialOdds)}, ${eventTime.toISOString()}, 'ai_agent')
      RETURNING *
    `;

    res.json(result[0]);
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate market" });
  }
}
