import { Router } from "express";
import { db } from "../db";
import { oracleNodes, oracleVotes, markets, marketEvents } from "../../shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

let broadcastFn: ((event: { type: string; data: unknown }) => void) | null = null;
export function setBroadcast(fn: (event: { type: string; data: unknown }) => void) {
  broadcastFn = fn;
}
function broadcast(event: { type: string; data: unknown }) {
  if (broadcastFn) broadcastFn(event);
}

export const oracleRoutes = Router();

oracleRoutes.get("/", async (_, res) => {
  try {
    const oracles = await db.select().from(oracleNodes).orderBy(desc(oracleNodes.createdAt));
    res.json(oracles);
  } catch (error) {
    console.error("Error fetching oracles:", error);
    res.status(500).json({ error: "Failed to fetch oracles" });
  }
});

oracleRoutes.post("/", async (req, res) => {
  try {
    const { name, dataSource, lineraChainId } = req.body;
    const [oracle] = await db.insert(oracleNodes).values({
      name,
      dataSource,
      lineraChainId,
    }).returning();
    
    broadcast({ type: "oracle_created", data: oracle });
    res.status(201).json(oracle);
  } catch (error) {
    console.error("Error creating oracle:", error);
    res.status(500).json({ error: "Failed to create oracle" });
  }
});

oracleRoutes.post("/:id/vote", async (req, res) => {
  try {
    const oracleId = parseInt(req.params.id);
    const { marketId, vote, confidence, dataHash } = req.body;

    const existingVote = await db.select().from(oracleVotes)
      .where(and(
        eq(oracleVotes.oracleId, oracleId),
        eq(oracleVotes.marketId, marketId)
      ));

    if (existingVote.length > 0) {
      return res.status(400).json({ error: "Oracle has already voted on this market" });
    }

    const [newVote] = await db.insert(oracleVotes).values({
      oracleId,
      marketId,
      vote,
      confidence,
      dataHash,
    }).returning();

    await db.update(oracleNodes).set({
      totalVotes: sql`${oracleNodes.totalVotes} + 1`,
    }).where(eq(oracleNodes.id, oracleId));

    await db.insert(marketEvents).values({
      marketId,
      eventType: "oracle_vote",
      data: { oracleId, vote, confidence },
    });

    broadcast({ type: "oracle_vote", data: { oracleId, marketId, vote, confidence } });

    const allVotes = await db.select().from(oracleVotes)
      .where(eq(oracleVotes.marketId, marketId));

    if (allVotes.length >= 3) {
      const consensus = checkConsensus(allVotes);
      if (consensus.hasConsensus) {
        await resolveMarketByConsensus(marketId, consensus.outcome!);
      }
    }

    res.json(newVote);
  } catch (error) {
    console.error("Error submitting oracle vote:", error);
    res.status(500).json({ error: "Failed to submit oracle vote" });
  }
});

oracleRoutes.get("/votes/:marketId", async (req, res) => {
  try {
    const marketId = parseInt(req.params.marketId);
    const votes = await db.select({
      vote: oracleVotes,
      oracle: oracleNodes,
    })
    .from(oracleVotes)
    .innerJoin(oracleNodes, eq(oracleVotes.oracleId, oracleNodes.id))
    .where(eq(oracleVotes.marketId, marketId));
    
    res.json(votes);
  } catch (error) {
    console.error("Error fetching oracle votes:", error);
    res.status(500).json({ error: "Failed to fetch oracle votes" });
  }
});

function checkConsensus(votes: { vote: number; confidence: number }[]): { hasConsensus: boolean; outcome?: number } {
  const voteCounts: Record<number, number> = {};
  
  for (const v of votes) {
    voteCounts[v.vote] = (voteCounts[v.vote] || 0) + v.confidence;
  }

  const totalWeight = Object.values(voteCounts).reduce((a, b) => a + b, 0);
  
  for (const [outcome, weight] of Object.entries(voteCounts)) {
    if (weight / totalWeight >= 0.67) {
      return { hasConsensus: true, outcome: parseInt(outcome) };
    }
  }

  return { hasConsensus: false };
}

async function resolveMarketByConsensus(marketId: number, outcome: number) {
  await db.update(markets).set({
    status: "resolved",
    resolvedOutcome: outcome,
    resolvedAt: new Date(),
  }).where(eq(markets.id, marketId));

  await db.insert(marketEvents).values({
    marketId,
    eventType: "market_resolved_by_consensus",
    data: { outcome },
  });

  broadcast({ type: "market_resolved", data: { marketId, outcome, method: "consensus" } });
}
