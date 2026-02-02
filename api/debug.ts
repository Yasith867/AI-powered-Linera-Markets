import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      CLOUDFLARE_API_KEY: !!process.env.CLOUDFLARE_API_KEY,
      CLOUDFLARE_ACCOUNT_ID: !!process.env.CLOUDFLARE_ACCOUNT_ID,
      LINERA_APP_ID: !!process.env.LINERA_APP_ID,
      LINERA_CHAIN_ID: !!process.env.LINERA_CHAIN_ID,
    }
  };

  // Test database connection
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`SELECT COUNT(*) as count FROM markets`;
    checks.database = { connected: true, marketCount: result[0].count };
  } catch (error: any) {
    checks.database = { connected: false, error: error.message };
  }

  // Test Cloudflare AI
  try {
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Say hello in 5 words" }]
        })
      }
    );
    const cfData = await cfResponse.json() as any;
    checks.cloudflareAI = { 
      connected: cfData.success === true, 
      response: cfData.result?.response?.slice(0, 100) || cfData.errors 
    };
  } catch (error: any) {
    checks.cloudflareAI = { connected: false, error: error.message };
  }

  res.json(checks);
}
