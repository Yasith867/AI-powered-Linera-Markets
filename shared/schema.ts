import { pgTable, serial, integer, text, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const markets = pgTable("markets", {
  id: serial("id").primaryKey(),
  lineraChainId: text("linera_chain_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  odds: jsonb("odds").$type<number[]>().notNull(),
  totalVolume: real("total_volume").default(0).notNull(),
  liquidity: real("liquidity").default(1000).notNull(),
  status: text("status").default("active").notNull(),
  resolvedOutcome: integer("resolved_outcome"),
  eventTime: timestamp("event_time"),
  createdBy: text("created_by").default("ai_agent").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const oracleNodes = pgTable("oracle_nodes", {
  id: serial("id").primaryKey(),
  lineraChainId: text("linera_chain_id"),
  name: text("name").notNull(),
  dataSource: text("data_source").notNull(),
  accuracy: real("accuracy").default(100).notNull(),
  totalVotes: integer("total_votes").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const oracleVotes = pgTable("oracle_votes", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  oracleId: integer("oracle_id").notNull().references(() => oracleNodes.id, { onDelete: "cascade" }),
  vote: integer("vote").notNull(),
  confidence: real("confidence").default(1).notNull(),
  dataHash: text("data_hash"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  traderAddress: text("trader_address").notNull(),
  optionIndex: integer("option_index").notNull(),
  amount: real("amount").notNull(),
  price: real("price").notNull(),
  isBuy: boolean("is_buy").default(true).notNull(),
  payout: real("payout"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const tradingBots = pgTable("trading_bots", {
  id: serial("id").primaryKey(),
  lineraChainId: text("linera_chain_id"),
  name: text("name").notNull(),
  ownerAddress: text("owner_address").notNull(),
  strategy: text("strategy").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
  totalTrades: integer("total_trades").default(0).notNull(),
  profitLoss: real("profit_loss").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const marketEvents = pgTable("market_events", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").references(() => markets.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertMarketSchema = createInsertSchema(markets).omit({ id: true, createdAt: true, resolvedAt: true });
export const insertOracleNodeSchema = createInsertSchema(oracleNodes).omit({ id: true, createdAt: true });
export const insertOracleVoteSchema = createInsertSchema(oracleVotes).omit({ id: true, createdAt: true });
export const insertTradeSchema = createInsertSchema(trades).omit({ id: true, createdAt: true });
export const insertTradingBotSchema = createInsertSchema(tradingBots).omit({ id: true, createdAt: true });
export const insertMarketEventSchema = createInsertSchema(marketEvents).omit({ id: true, createdAt: true });

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Market = typeof markets.$inferSelect;
export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type OracleNode = typeof oracleNodes.$inferSelect;
export type InsertOracleNode = z.infer<typeof insertOracleNodeSchema>;
export type OracleVote = typeof oracleVotes.$inferSelect;
export type InsertOracleVote = z.infer<typeof insertOracleVoteSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type TradingBot = typeof tradingBots.$inferSelect;
export type InsertTradingBot = z.infer<typeof insertTradingBotSchema>;
export type MarketEvent = typeof marketEvents.$inferSelect;
export type InsertMarketEvent = z.infer<typeof insertMarketEventSchema>;
