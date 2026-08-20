import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({
    error: "not_found",
    message: "Route not found",
    statusCode: 404,
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "validation_error",
      message: "Invalid request payload",
      statusCode: 400,
      issues: err.flatten(),
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "internal_server_error",
    message: "An unexpected error occurred",
    statusCode: 500,
  });
}
