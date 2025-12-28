/**
 * MCP Connection Manager - Handles connections to multiple MCP servers
 * Manages lifecycle, retry logic, and health checks
 */

import { createMCPClient } from '@ai-sdk/mcp';
import type {
  MCPServerConfig,
  MCPServerInstance,
  MCPTransportConfig,
} from './types';
import { mcpRegistry } from './registry';

/**
 * Connection options
 */
export interface MCPConnectionOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  healthCheckInterval?: number;
}

/**
 * Default connection options
 */
const DEFAULT_OPTIONS: Required<MCPConnectionOptions> = {
  timeout: 10000, // 10 seconds
  retryAttempts: 2,
  retryDelay: 1000, // 1 second
  healthCheckInterval: 60000, // 1 minute
};

/**
 * MCP Connection Manager
 * Handles connection lifecycle for multiple MCP servers
 */
export class MCPConnectionManager {
  private static instance: MCPConnectionManager | null = null;
  private options: Required<MCPConnectionOptions>;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private connectionPromises: Map<string, Promise<boolean>> = new Map();

  private constructor(options: MCPConnectionOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: MCPConnectionOptions): MCPConnectionManager {
    if (!MCPConnectionManager.instance) {
      MCPConnectionManager.instance = new MCPConnectionManager(options);
    }
    return MCPConnectionManager.instance;
  }

  /**
   * Connect to a single MCP server
   */
  async connect(serverId: string): Promise<boolean> {
    // Check if already connecting
    const existingPromise = this.connectionPromises.get(serverId);
    if (existingPromise) {
      console.log('[MCP Connection] Already connecting to', serverId);
      return existingPromise;
    }

    const instance = mcpRegistry.getServer(serverId);
    if (!instance) {
      console.error('[MCP Connection] Server not found:', serverId);
      return false;
    }

    if (instance.status === 'connected') {
      console.log('[MCP Connection] Server already connected:', serverId);
      return true;
    }

    // Create connection promise
    const connectionPromise = this._connectWithRetry(instance);
    this.connectionPromises.set(serverId, connectionPromise);

    try {
      const result = await connectionPromise;
      return result;
    } finally {
      this.connectionPromises.delete(serverId);
    }
  }

  /**
   * Connect with retry logic
   */
  private async _connectWithRetry(instance: MCPServerInstance): Promise<boolean> {
    const { config } = instance;
    const maxAttempts = config.retryAttempts ?? this.options.retryAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(
          `[MCP Connection] Attempt ${attempt}/${maxAttempts} for ${config.id}`
        );

        const success = await this._connectOnce(instance);
        if (success) {
          // Start health check
          this._startHealthCheck(config.id);
          return true;
        }
      } catch (error) {
        console.error(
          `[MCP Connection] Attempt ${attempt}/${maxAttempts} failed for ${config.id}:`,
          error
        );

        // Wait before retry (except on last attempt)
        if (attempt < maxAttempts) {
          await this._delay(this.options.retryDelay);
        }
      }
    }

    // All attempts failed
    mcpRegistry.updateServerStatus(
      config.id,
      'error',
      undefined,
      undefined,
      undefined,
      new Error(`Failed to connect after ${maxAttempts} attempts`)
    );
    return false;
  }

  /**
   * Single connection attempt
   */
  private async _connectOnce(instance: MCPServerInstance): Promise<boolean> {
    const { config } = instance;
    const timeout = config.timeout ?? this.options.timeout;

    try {
      // Update status to connecting
      mcpRegistry.updateServerStatus(config.id, 'connecting');

      // Create MCP client with timeout
      const client = await this._createClientWithTimeout(config.transport, timeout);

      if (!client) {
        throw new Error('Failed to create MCP client');
      }

      // Fetch tools from the server
      const tools = await this._getToolsWithTimeout(client, timeout);

      // Extract metadata if available
      const metadata = await this._extractMetadata(config);

      // Update registry with successful connection
      mcpRegistry.updateServerStatus(
        config.id,
        'connected',
        client,
        tools,
        metadata
      );

      console.log(
        `[MCP Connection] Successfully connected to ${config.id} with ${Object.keys(tools).length} tools`
      );

      return true;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error(`[MCP Connection] Error connecting to ${config.id}:`, errorObj);

      mcpRegistry.updateServerStatus(
        config.id,
        'error',
        undefined,
        undefined,
        undefined,
        errorObj
      );

      return false;
    }
  }

  /**
   * Create MCP client with timeout
   */
  private async _createClientWithTimeout(
    transport: MCPTransportConfig,
    timeout: number
  ): Promise<Awaited<ReturnType<typeof createMCPClient>> | null> {
    try {
      // Cast transport to any to avoid type conflicts with MCP SDK
      const mcpTransport: any = transport;
      const clientPromise = createMCPClient({ transport: mcpTransport });

      const client = await Promise.race([
        clientPromise,
        this._timeoutPromise<Awaited<ReturnType<typeof createMCPClient>>>(
          timeout,
          'Client creation timeout'
        ),
      ]);

      return client;
    } catch (error) {
      console.error('[MCP Connection] Failed to create client:', error);
      return null;
    }
  }

  /**
   * Get tools with timeout
   */
  private async _getToolsWithTimeout(
    client: Awaited<ReturnType<typeof createMCPClient>>,
    timeout: number
  ): Promise<Record<string, unknown>> {
    try {
      const toolsPromise = client.tools();

      const tools = await Promise.race([
        toolsPromise,
        this._timeoutPromise<Record<string, unknown>>(timeout, 'Tools fetch timeout'),
      ]);

      return tools ?? {};
    } catch (error) {
      console.error('[MCP Connection] Failed to get tools:', error);
      return {};
    }
  }

  /**
   * Extract metadata from MCP server (if available)
   */
  private async _extractMetadata(
    config: MCPServerConfig
  ): Promise<any> {
    // Try to extract server info if MCP provides it
    // This is a placeholder - actual implementation depends on MCP protocol
    return {
      id: config.id,
      name: config.name,
      description: config.description || '',
      version: '1.0.0',
      capabilities: config.capabilities || {
        tools: true,
        resources: false,
        prompts: false,
        elicitation: false,
      },
      tags: config.tags || [],
    };
  }

  /**
   * Disconnect from a server
   */
  async disconnect(serverId: string): Promise<void> {
    const instance = mcpRegistry.getServer(serverId);
    if (!instance || !instance.client) {
      console.log('[MCP Connection] Server not connected:', serverId);
      return;
    }

    try {
      // Stop health check
      this._stopHealthCheck(serverId);

      // Close client
      await instance.client.close();

      // Update registry
      await mcpRegistry.disconnectServer(serverId);

      console.log('[MCP Connection] Disconnected from', serverId);
    } catch (error) {
      console.error('[MCP Connection] Error disconnecting from', serverId, ':', error);
    }
  }

  /**
   * Connect to multiple servers in parallel
   */
  async connectAll(serverIds?: string[]): Promise<Map<string, boolean>> {
    const servers = serverIds
      ? serverIds.map((id) => mcpRegistry.getServer(id)).filter((s) => s !== undefined)
      : mcpRegistry.getAllServers();

    console.log('[MCP Connection] Connecting to', servers.length, 'servers');

    const results = await Promise.allSettled(
      servers.map((server) => this.connect(server!.config.id))
    );

    const statusMap = new Map<string, boolean>();
    servers.forEach((server, index) => {
      const result = results[index];
      const success = result.status === 'fulfilled' && result.value === true;
      statusMap.set(server!.config.id, success);
    });

    const successCount = Array.from(statusMap.values()).filter((v) => v).length;
    console.log(
      `[MCP Connection] Connected ${successCount}/${servers.length} servers successfully`
    );

    return statusMap;
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    const servers = mcpRegistry.getConnectedServers();
    console.log('[MCP Connection] Disconnecting from', servers.length, 'servers');

    await Promise.allSettled(
      servers.map((server) => this.disconnect(server.config.id))
    );

    console.log('[MCP Connection] Disconnected all servers');
  }

  /**
   * Start health check for a server
   */
  private _startHealthCheck(serverId: string): void {
    // Clear existing interval if any
    this._stopHealthCheck(serverId);

    // Set up periodic health check
    const interval = setInterval(() => {
      this._performHealthCheck(serverId);
    }, this.options.healthCheckInterval);

    this.healthCheckIntervals.set(serverId, interval);
  }

  /**
   * Stop health check for a server
   */
  private _stopHealthCheck(serverId: string): void {
    const interval = this.healthCheckIntervals.get(serverId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(serverId);
    }
  }

  /**
   * Perform health check on a server
   */
  private async _performHealthCheck(serverId: string): Promise<void> {
    const instance = mcpRegistry.getServer(serverId);
    if (!instance || instance.status !== 'connected') {
      return;
    }

    try {
      // Simple health check - try to get tools
      // In a real implementation, MCP might have a ping/health endpoint
      const tools = await this._getToolsWithTimeout(instance.client, 5000);

      if (Object.keys(tools).length === 0) {
        console.warn('[MCP Connection] Health check failed for', serverId);
        // Attempt reconnection
        await this.connect(serverId);
      }
    } catch (error) {
      console.error('[MCP Connection] Health check error for', serverId, ':', error);
      // Mark as error and attempt reconnection
      mcpRegistry.updateServerStatus(
        serverId,
        'error',
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
      await this.connect(serverId);
    }
  }

  /**
   * Helper: Create timeout promise
   */
  private _timeoutPromise<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  /**
   * Helper: Delay
   */
  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    // Stop all health checks
    for (const serverId of this.healthCheckIntervals.keys()) {
      this._stopHealthCheck(serverId);
    }

    // Disconnect all servers
    await this.disconnectAll();

    console.log('[MCP Connection] Cleaned up all resources');
  }
}

// Export singleton instance
export const mcpConnectionManager = MCPConnectionManager.getInstance();
