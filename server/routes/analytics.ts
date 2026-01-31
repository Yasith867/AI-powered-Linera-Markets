import { Router } from "express";
import { db } from "../db";
import { markets, trades, oracleNodes, oracleVotes, tradingBots, marketEvents } from "../../shared/schema";
import { eq, desc, sql, count, sum, avg } from "drizzle-orm";

export const analyticsRoutes = Router();

analyticsRoutes.get("/overview", async (_, res) => {
  try {
    const [marketStats] = await db.select({
      total: count(),
      active: sql<number>`count(*) filter (where status = 'active')`,
      resolved: sql<number>`count(*) filter (where status = 'resolved')`,
      totalVolume: sql<number>`coalesce(sum(total_volume), 0)`,
    }).from(markets);

    const [tradeStats] = await db.select({
      total: count(),
      totalValue: sql<number>`coalesce(sum(amount), 0)`,
    }).from(trades);

    const [oracleStats] = await db.select({
      total: count(),
      active: sql<number>`count(*) filter (where is_active = true)`,
      totalVotes: sql<number>`coalesce(sum(total_votes), 0)`,
    }).from(oracleNodes);

    const [botStats] = await db.select({
      total: count(),
      active: sql<number>`count(*) filter (where is_active = true)`,
      totalTrades: sql<number>`coalesce(sum(total_trades), 0)`,
    }).from(tradingBots);

    res.json({
      markets: marketStats,
      trades: tradeStats,
      oracles: oracleStats,
      bots: botStats,
    });
  } catch (error) {
    console.error("Error fetching analytics overview:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

analyticsRoutes.get("/volume-history", async (_, res) => {
  try {
    const history = await db.select({
      date: sql<string>`date_trunc('day', created_at)::date`,
      volume: sql<number>`sum(amount)`,
      trades: count(),
    })
    .from(trades)
    .groupBy(sql`date_trunc('day', created_at)::date`)
    .orderBy(sql`date_trunc('day', created_at)::date`);

    res.json(history);
  } catch (error) {
    console.error("Error fetching volume history:", error);
    res.status(500).json({ error: "Failed to fetch volume history" });
  }
});

analyticsRoutes.get("/top-markets", async (_, res) => {
  try {
    const topMarkets = await db.select()
      .from(markets)
      .orderBy(desc(markets.totalVolume))
      .limit(10);

    res.json(topMarkets);
  } catch (error) {
    console.error("Error fetching top markets:", error);
    res.status(500).json({ error: "Failed to fetch top markets" });
  }
});

analyticsRoutes.get("/oracle-performance", async (_, res) => {
  try {
    const performance = await db.select({
      id: oracleNodes.id,
      name: oracleNodes.name,
      accuracy: oracleNodes.accuracy,
      totalVotes: oracleNodes.totalVotes,
      dataSource: oracleNodes.dataSource,
    })
    .from(oracleNodes)
    .orderBy(desc(oracleNodes.accuracy));

    res.json(performance);
  } catch (error) {
    console.error("Error fetching oracle performance:", error);
    res.status(500).json({ error: "Failed to fetch oracle performance" });
  }
});

analyticsRoutes.get("/bot-leaderboard", async (_, res) => {
  try {
    const leaderboard = await db.select({
      id: tradingBots.id,
      name: tradingBots.name,
      strategy: tradingBots.strategy,
      totalTrades: tradingBots.totalTrades,
      profitLoss: tradingBots.profitLoss,
      isActive: tradingBots.isActive,
    })
    .from(tradingBots)
    .orderBy(desc(tradingBots.profitLoss));

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching bot leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch bot leaderboard" });
  }
});

analyticsRoutes.get("/recent-events", async (_, res) => {
  try {
    const events = await db.select()
      .from(marketEvents)
      .orderBy(desc(marketEvents.createdAt))
      .limit(50);

    res.json(events);
  } catch (error) {
    console.error("Error fetching recent events:", error);
    res.status(500).json({ error: "Failed to fetch recent events" });
  }
});

analyticsRoutes.get("/category-breakdown", async (_, res) => {
  try {
    const breakdown = await db.select({
      category: markets.category,
      count: count(),
      volume: sql<number>`coalesce(sum(total_volume), 0)`,
    })
    .from(markets)
    .groupBy(markets.category);

    res.json(breakdown);
  } catch (error) {
    console.error("Error fetching category breakdown:", error);
    res.status(500).json({ error: "Failed to fetch category breakdown" });
  }
});
