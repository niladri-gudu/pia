import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { devRouter } from "./modules/dev/dev.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { projectsRouter } from "./modules/projects/projects.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { githubDevRouter } from "./modules/dev/github.routes.js";

export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.json({
      service: "project-intelligence-api",
      message: "Project Intelligence Agent API",
      version: "0.1.0",
    });
  });

  app.use("/dev", githubDevRouter);

  app.use("/health", healthRouter);

  app.use("/projects", projectsRouter);

  if (env.NODE_ENV !== "production") {
    app.use("/dev", devRouter);
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
