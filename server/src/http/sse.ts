import type { Response } from "express";
import type { RunTimelineEvent } from "@agentledger/shared";

export class SSEChannelManager {
  private clients: Map<string, Set<Response>> = new Map();

  addClient(runId: string, res: Response): void {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    if (!this.clients.has(runId)) {
      this.clients.set(runId, new Set());
    }

    this.clients.get(runId)?.add(res);

    // Send initial keep-alive comment
    res.write(": keepalive\n\n");

    res.on("close", () => {
      this.clients.get(runId)?.delete(res);
      if (this.clients.get(runId)?.size === 0) {
        this.clients.delete(runId);
      }
    });
  }

  broadcast(runId: string, event: RunTimelineEvent): void {
    const clients = this.clients.get(runId);
    if (!clients || clients.size === 0) return;

    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of clients) {
      res.write(data);
    }
  }
}

export const sseManager = new SSEChannelManager();
