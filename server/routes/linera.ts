import { Router } from "express";
import * as lineraClient from "../linera/client";

export const lineraRoutes = Router();

lineraRoutes.get("/stats", async (_, res) => {
  try {
    const stats = lineraClient.getLineraStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to get Linera stats" });
  }
});

lineraRoutes.get("/transactions", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const transactions = lineraClient.getRecentTransactions(limit);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: "Failed to get transactions" });
  }
});

lineraRoutes.post("/chain", async (req, res) => {
  try {
    const { applicationId } = req.body;
    const chain = await lineraClient.createMicrochain(applicationId || "default");
    res.json(chain);
  } catch (error) {
    res.status(500).json({ error: "Failed to create chain" });
  }
});

lineraRoutes.post("/message", async (req, res) => {
  try {
    const { sourceChain, targetChain, messageType, data } = req.body;
    await lineraClient.sendCrossChainMessage(sourceChain, targetChain, messageType, data);
    res.json({ success: true, message: "Cross-chain message sent" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});
