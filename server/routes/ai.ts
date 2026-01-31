import { Router } from "express";
import OpenAI from "openai";
import { db } from "../db";
import { markets, marketEvents } from "../../shared/schema";

let broadcastFn: ((event: { type: string; data: unknown }) => void) | null = null;
export function setBroadcast(fn: (event: { type: string; data: unknown }) => void) {
  broadcastFn = fn;
}
function broadcast(event: { type: string; data: unknown }) {
  if (broadcastFn) broadcastFn(event);
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export const aiRoutes = Router();

aiRoutes.post("/generate-market", async (req, res) => {
  try {
    const { category, context } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
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
  "eventTime": "ISO timestamp when event resolves (optional)"
}
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
    
    const [market] = await db.insert(markets).values({
      title: marketData.title,
      description: marketData.description,
      category: marketData.category || category || "general",
      options: marketData.options,
      odds: initialOdds,
      eventTime: marketData.eventTime ? new Date(marketData.eventTime) : null,
      createdBy: "ai_agent",
    }).returning();

    await db.insert(marketEvents).values({
      marketId: market.id,
      eventType: "ai_market_created",
      data: { prompt: context, category },
    });

    broadcast({ type: "ai_market_created", data: market });
    res.json(market);
  } catch (error) {
    console.error("Error generating AI market:", error);
    res.status(500).json({ error: "Failed to generate market" });
  }
});

aiRoutes.post("/analyze-market", async (req, res) => {
  try {
    const { marketId, marketData } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `You are an AI analyst for prediction markets. Analyze the market data and provide insights.
Return JSON with:
{
  "analysis": "Brief market analysis",
  "sentiment": "bullish|bearish|neutral",
  "confidence": 0.0-1.0,
  "factors": ["key factor 1", "key factor 2"],
  "recommendation": "buy|sell|hold",
  "targetOption": 0 (index of recommended option if buying)
}`,
        },
        {
          role: "user",
          content: `Analyze this prediction market: ${JSON.stringify(marketData)}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(response.choices[0]?.message?.content || "{}");
    res.json({ marketId, ...analysis });
  } catch (error) {
    console.error("Error analyzing market:", error);
    res.status(500).json({ error: "Failed to analyze market" });
  }
});

aiRoutes.post("/fetch-events", async (req, res) => {
  try {
    const { category } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `You are an AI that identifies current events suitable for prediction markets.
Generate 3-5 potential market ideas based on recent news and trends.
Return JSON array:
[
  {
    "title": "Market question?",
    "description": "Why this is interesting",
    "category": "sports|crypto|politics|entertainment|technology",
    "options": ["Yes", "No"] or multiple options,
    "urgency": "high|medium|low",
    "dataSource": "where to verify outcome"
  }
]`,
        },
        {
          role: "user",
          content: `Find prediction market opportunities for category: ${category || "trending"}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = JSON.parse(response.choices[0]?.message?.content || "{}");
    const events = content.events || content.markets || [];
    res.json({ events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

aiRoutes.post("/oracle-data", async (req, res) => {
  try {
    const { marketId, question, options } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `You are an oracle AI that determines the outcome of prediction market questions.
Based on publicly available information, determine the most likely correct answer.
Return JSON:
{
  "outcome": 0 (index of correct option),
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "sources": ["source1", "source2"],
  "dataHash": "hash of evidence"
}
If the outcome is uncertain or the event hasn't occurred, return confidence < 0.5.`,
        },
        {
          role: "user",
          content: `Determine outcome for: "${question}" Options: ${JSON.stringify(options)}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const oracleData = JSON.parse(response.choices[0]?.message?.content || "{}");
    res.json({ marketId, ...oracleData });
  } catch (error) {
    console.error("Error getting oracle data:", error);
    res.status(500).json({ error: "Failed to get oracle data" });
  }
});
