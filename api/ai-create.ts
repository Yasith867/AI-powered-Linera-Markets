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
    const { category } = req.body;

    // Call Cloudflare Workers AI directly
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You create prediction markets. Reply ONLY with valid JSON, no other text:
{"title":"Question ending with ?","description":"Brief context","options":["Yes","No"],"days":4}`
            },
            {
              role: "user",
              content: `Create a prediction market about ${category || "current events"}. Reply with JSON only.`
            }
          ]
        })
      }
    );

    const cfData = await cfResponse.json() as any;
    
    if (!cfData.success && cfData.errors) {
      throw new Error(cfData.errors[0]?.message || 'Cloudflare AI error');
    }

    const aiText = cfData.result?.response || '';
    
    // Extract JSON from response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in AI response');
    }
    
    const marketData = JSON.parse(jsonMatch[0]);
    const options = marketData.options || ["Yes", "No"];
    const initialOdds = options.map(() => 1 / options.length);
    const eventTime = new Date();
    eventTime.setDate(eventTime.getDate() + (marketData.days || 4));
    
    const result = await sql`
      INSERT INTO markets (title, description, category, options, odds, event_time, created_by)
      VALUES (
        ${marketData.title || `Will ${category} happen?`}, 
        ${marketData.description || `Prediction market about ${category}`}, 
        ${category || "general"}, 
        ${JSON.stringify(options)}, 
        ${JSON.stringify(initialOdds)}, 
        ${eventTime.toISOString()}, 
        'ai_agent'
      )
      RETURNING *
    `;

    res.json(result[0]);
  } catch (error: any) {
    console.error("AI Create Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate market" });
  }
}
