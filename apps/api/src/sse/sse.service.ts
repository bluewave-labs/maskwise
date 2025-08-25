import { Injectable } from '@nestjs/common';
import { Response } from 'express';

export interface SSEClient {
  id: string;
  userId: string;
  response: Response;
  lastHeartbeat: Date;
}

export interface SSEEvent {
  type: 'job_status' | 'notification' | 'dataset_update' | 'heartbeat' | 'system_status';
  data: any;
  userId?: string;
  timestamp: Date;
}

@Injectable()
export class SSEService {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor() {
    this.startHeartbeat();
  }

  addClient(clientId: string, userId: string, response: Response): void {
    const client: SSEClient = {
      id: clientId,
      userId,
      response,
      lastHeartbeat: new Date(),
    };

    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    response.write('data: {"type":"connected","message":"SSE connection established"}\n\n');

    response.on('close', () => {
      this.removeClient(clientId);
    });

    this.clients.set(clientId, client);
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.response.end();
      } catch (error) {
        // Client already disconnected
      }
      this.clients.delete(clientId);
    }
  }

  broadcast(event: SSEEvent): void {
    const message = this.formatSSEMessage(event);
    const clientsToRemove: string[] = [];

    for (const [clientId, client] of this.clients) {
      // Send to all clients if no specific user, or to specific user
      if (!event.userId || client.userId === event.userId) {
        try {
          client.response.write(message);
          client.lastHeartbeat = new Date();
        } catch (error) {
          clientsToRemove.push(clientId);
        }
      }
    }

    // Clean up disconnected clients
    clientsToRemove.forEach(clientId => this.removeClient(clientId));
  }

  sendToUser(userId: string, event: SSEEvent): void {
    const userClients = Array.from(this.clients.values()).filter(
      client => client.userId === userId
    );

    const message = this.formatSSEMessage(event);
    const clientsToRemove: string[] = [];

    userClients.forEach(client => {
      try {
        client.response.write(message);
        client.lastHeartbeat = new Date();
      } catch (error) {
        clientsToRemove.push(client.id);
      }
    });

    clientsToRemove.forEach(clientId => this.removeClient(clientId));
  }

  sendJobUpdate(jobId: string, status: string, userId: string, progress?: number, message?: string): void {
    const event: SSEEvent = {
      type: 'job_status',
      data: {
        jobId,
        status,
        progress: progress || 0,
        message: message || `Job ${status}`,
      },
      userId,
      timestamp: new Date(),
    };

    this.sendToUser(userId, event);
  }

  sendDatasetUpdate(datasetId: string, status: string, userId: string, findingsCount?: number): void {
    const event: SSEEvent = {
      type: 'dataset_update',
      data: {
        datasetId,
        status,
        findingsCount: findingsCount || 0,
        message: `Dataset ${status}`,
      },
      userId,
      timestamp: new Date(),
    };

    this.sendToUser(userId, event);
  }

  sendNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const event: SSEEvent = {
      type: 'notification',
      data: {
        title,
        message,
        type,
        id: `notification_${Date.now()}`,
      },
      userId,
      timestamp: new Date(),
    };

    this.sendToUser(userId, event);
  }

  getConnectedClients(): { total: number; byUser: Record<string, number> } {
    const byUser: Record<string, number> = {};
    
    for (const client of this.clients.values()) {
      byUser[client.userId] = (byUser[client.userId] || 0) + 1;
    }

    return {
      total: this.clients.size,
      byUser,
    };
  }

  private formatSSEMessage(event: SSEEvent): string {
    const data = JSON.stringify({
      type: event.type,
      data: event.data,
      timestamp: event.timestamp.toISOString(),
    });

    return `data: ${data}\n\n`;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeatEvent: SSEEvent = {
        type: 'heartbeat',
        data: { timestamp: new Date().toISOString() },
        timestamp: new Date(),
      };

      this.broadcast(heartbeatEvent);
    }, 30000); // Every 30 seconds
  }

  onModuleDestroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    for (const clientId of this.clients.keys()) {
      this.removeClient(clientId);
    }
  }
}