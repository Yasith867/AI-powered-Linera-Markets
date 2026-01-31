import { Router } from "express";
import { db } from "../db";
import { tradingBots, trades, markets } from "../../shared/schema";
import { eq, desc, sql } from "drizzle-orm";

let broadcastFn: ((event: { type: string; data: unknown }) => void) | null = null;
export function setBroadcast(fn: (event: { type: string; data: unknown }) => void) {
  broadcastFn = fn;
}
function broadcast(event: { type: string; data: unknown }) {
  if (broadcastFn) broadcastFn(event);
}

export const botRoutes = Router();

botRoutes.get("/", async (_, res) => {
  try {
    const bots = await db.select().from(tradingBots).orderBy(desc(tradingBots.createdAt));
    res.json(bots);
  } catch (error) {
    console.error("Error fetching bots:", error);
    res.status(500).json({ error: "Failed to fetch bots" });
  }
});

botRoutes.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [bot] = await db.select().from(tradingBots).where(eq(tradingBots.id, id));
    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    const botTrades = await db.select().from(trades)
      .where(eq(trades.traderAddress, `bot_${id}`))
      .orderBy(desc(trades.createdAt));

    res.json({ ...bot, trades: botTrades });
  } catch (error) {
    console.error("Error fetching bot:", error);
    res.status(500).json({ error: "Failed to fetch bot" });
  }
});

botRoutes.post("/", async (req, res) => {
  try {
    const { name, ownerAddress, strategy, config, lineraChainId } = req.body;
    
    const [bot] = await db.insert(tradingBots).values({
      name,
      ownerAddress,
      strategy,
      config: config || {},
      lineraChainId,
    }).returning();

    broadcast({ type: "bot_created", data: bot });
    res.status(201).json(bot);
  } catch (error) {
    console.error("Error creating bot:", error);
    res.status(500).json({ error: "Failed to create bot" });
  }
});

botRoutes.post("/:id/execute", async (req, res) => {
  try {
    const botId = parseInt(req.params.id);
    const [bot] = await db.select().from(tradingBots).where(eq(tradingBots.id, botId));
    
    if (!bot || !bot.isActive) {
      return res.status(400).json({ error: "Bot not available" });
    }

    const activeMarkets = await db.select().from(markets)
      .where(eq(markets.status, "active"));

    const tradeDecisions = await executeStrategy(bot, activeMarkets);
    
    for (const decision of tradeDecisions) {
      const [market] = await db.select().from(markets).where(eq(markets.id, decision.marketId));
      if (!market) continue;

      const currentOdds = market.odds as number[];
      const price = currentOdds[decision.optionIndex];

      await db.insert(trades).values({
        marketId: decision.marketId,
        traderAddress: `bot_${botId}`,
        optionIndex: decision.optionIndex,
        amount: decision.amount,
        price,
        isBuy: decision.isBuy,
      });

      await db.update(tradingBots).set({
        totalTrades: sql`${tradingBots.totalTrades} + 1`,
      }).where(eq(tradingBots.id, botId));
    }

    broadcast({ type: "bot_executed", data: { botId, trades: tradeDecisions.length } });
    res.json({ success: true, trades: tradeDecisions });
  } catch (error) {
    console.error("Error executing bot:", error);
    res.status(500).json({ error: "Failed to execute bot" });
  }
});

botRoutes.patch("/:id/toggle", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [bot] = await db.select().from(tradingBots).where(eq(tradingBots.id, id));
    
    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    const [updated] = await db.update(tradingBots).set({
      isActive: !bot.isActive,
    }).where(eq(tradingBots.id, id)).returning();

    broadcast({ type: "bot_toggled", data: updated });
    res.json(updated);
  } catch (error) {
    console.error("Error toggling bot:", error);
    res.status(500).json({ error: "Failed to toggle bot" });
  }
});

interface TradeDecision {
  marketId: number;
  optionIndex: number;
  amount: number;
  isBuy: boolean;
}

async function executeStrategy(
  bot: typeof tradingBots.$inferSelect,
  activeMarkets: (typeof markets.$inferSelect)[]
): Promise<TradeDecision[]> {
  const decisions: TradeDecision[] = [];
  const config = bot.config as Record<string, unknown>;

  switch (bot.strategy) {
    case "momentum":
      for (const market of activeMarkets) {
        const odds = market.odds as number[];
        const maxOddIndex = odds.indexOf(Math.max(...odds));
        if (odds[maxOddIndex] > 0.6) {
          decisions.push({
            marketId: market.id,
            optionIndex: maxOddIndex,
            amount: (config.tradeSize as number) || 10,
            isBuy: true,
          });
        }
      }
      break;

    case "contrarian":
      for (const market of activeMarkets) {
        const odds = market.odds as number[];
        const minOddIndex = odds.indexOf(Math.min(...odds));
        if (odds[minOddIndex] < 0.3) {
          decisions.push({
            marketId: market.id,
            optionIndex: minOddIndex,
            amount: (config.tradeSize as number) || 10,
            isBuy: true,
          });
        }
      }
      break;

    case "arbitrage":
      for (const market of activeMarkets) {
        const odds = market.odds as number[];
        const totalImpliedProb = odds.reduce((a, b) => a + b, 0);
        if (totalImpliedProb < 0.95) {
          odds.forEach((odd, index) => {
            if (odd < 0.5) {
              decisions.push({
                marketId: market.id,
                optionIndex: index,
                amount: (config.tradeSize as number) || 5,
                isBuy: true,
              });
            }
          });
        }
      }
      break;

    default:
      break;
  }

  return decisions;
}
