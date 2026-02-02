import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.json({ error: "DATABASE_URL not set", env: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('PASSWORD')) });
    }
    
    const sql = neon(dbUrl);
    const result = await sql`SELECT NOW() as time, current_database() as db`;
    
    return res.json({ 
      status: "ok", 
      database: result[0],
      hasCloudflareKey: !!process.env.CLOUDFLARE_API_KEY,
      hasCloudflareAccount: !!process.env.CLOUDFLARE_ACCOUNT_ID,
    });
  } catch (error: any) {
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    });
  }
}
