import { Router } from "express";
import { prisma } from "@project-intelligence/database";
import { SERVICE_NAME } from "@project-intelligence/config";
import { pingRedis } from "../../lib/redis.js";

export const healthRouter: Router = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/redis", async (_req, res) => {
  try {
    const pong = await pingRedis();
    res.json({
      status: "ok",
      redis: pong === "PONG",
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      redis: false,
      message: err instanceof Error ? err.message : "Redis unreachable",
    });
  }
});

healthRouter.get("/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      database: true,
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      database: false,
      message: err instanceof Error ? err.message : "Database unreachable",
    });
  }
});
