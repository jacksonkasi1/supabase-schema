/**
 * MCP Registry - Central registry for managing multiple MCP servers
 * Supports dynamic loading, configuration-driven setup, and lifecycle management
 */

import type {
  MCPServerConfig,
  MCPServerInstance,
  MCPConnectionStatus,
  MCPRegistryConfig,
  MCPManagerStats,
  MCPLifecycleHandler,
  MCPLifecycleHook,
  MCPMetadata,
} from './types';

/**
 * Central registry for all MCP servers
 * Singleton pattern to ensure one registry instance
 */
export class MCPRegistry {
  private static instance: MCPRegistry | null = null;
  private servers: Map<string, MCPServerInstance> = new Map();
  private lifecycleHandlers: Map<MCPLifecycleHook, MCPLifecycleHandler[]> = new Map();
  private config: MCPRegistryConfig | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MCPRegistry {
    if (!MCPRegistry.instance) {
      MCPRegistry.instance = new MCPRegistry();
    }
    return MCPRegistry.instance;
  }

  /**
   * Initialize registry with configuration
   */
  async initialize(config: MCPRegistryConfig): Promise<void> {
    this.config = config;
    console.log('[MCP Registry] Initializing with', config.servers.length, 'servers');

    // Register all servers from config
    for (const serverConfig of config.servers) {
      if (serverConfig.enabled !== false) {
        await this.registerServer(serverConfig);
      } else {
        console.log('[MCP Registry] Server', serverConfig.id, 'is disabled');
      }
    }
  }

  /**
   * Register a new MCP server
   */
  async registerServer(config: MCPServerConfig): Promise<void> {
    if (this.servers.has(config.id)) {
      console.warn('[MCP Registry] Server', config.id, 'already registered');
      return;
    }

    const instance: MCPServerInstance = {
      config,
      client: null,
      tools: {},
      status: 'disconnected',
      metadata: undefined,
    };

    this.servers.set(config.id, instance);
    console.log('[MCP Registry] Registered server:', config.id);
  }

  /**
   * Unregister an MCP server
   */
  async unregisterServer(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      console.warn('[MCP Registry] Server', serverId, 'not found');
      return;
    }

    // Disconnect if connected
    if (instance.status === 'connected') {
      await this.disconnectServer(serverId);
    }

    this.servers.delete(serverId);
    console.log('[MCP Registry] Unregistered server:', serverId);
  }

  /**
   * Connect to an MCP server
   */
  async connectServer(serverId: string): Promise<boolean> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      console.error('[MCP Registry] Server', serverId, 'not found');
      return false;
    }

    if (instance.status === 'connected') {
      console.log('[MCP Registry] Server', serverId, 'already connected');
      return true;
    }

    try {
      await this.emitLifecycleEvent('beforeConnect', serverId);
      instance.status = 'connecting';

      // Connection will be handled by MCPConnectionManager
      // This just updates the registry state
      console.log('[MCP Registry] Server', serverId, 'marked for connection');

      return true;
    } catch (error) {
      instance.status = 'error';
      instance.error = error instanceof Error ? error : new Error(String(error));
      await this.emitLifecycleEvent('onError', serverId, undefined, instance.error);
      return false;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (!instance) return;

    await this.emitLifecycleEvent('beforeDisconnect', serverId);

    instance.status = 'disconnected';
    instance.client = null;
    instance.tools = {};
    instance.connectedAt = undefined;

    await this.emitLifecycleEvent('afterDisconnect', serverId);
    console.log('[MCP Registry] Disconnected server:', serverId);
  }

  /**
   * Update server connection status
   */
  updateServerStatus(
    serverId: string,
    status: MCPConnectionStatus,
    client?: any,
    tools?: Record<string, unknown>,
    metadata?: MCPMetadata,
    error?: Error
  ): void {
    const instance = this.servers.get(serverId);
    if (!instance) return;

    instance.status = status;
    if (client) instance.client = client;
    if (tools) instance.tools = tools;
    if (metadata) instance.metadata = metadata;
    if (error) instance.error = error;

    if (status === 'connected') {
      instance.connectedAt = new Date();
      this.emitLifecycleEvent('afterConnect', serverId);
    }
  }

  /**
   * Mark server as used (for tracking)
   */
  markServerUsed(serverId: string): void {
    const instance = this.servers.get(serverId);
    if (instance) {
      instance.lastUsedAt = new Date();
    }
  }

  /**
   * Get server instance
   */
  getServer(serverId: string): MCPServerInstance | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Get all registered servers
   */
  getAllServers(): MCPServerInstance[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get connected servers only
   */
  getConnectedServers(): MCPServerInstance[] {
    return Array.from(this.servers.values()).filter(
      (s) => s.status === 'connected'
    );
  }

  /**
   * Get servers by tag
   */
  getServersByTag(tag: string): MCPServerInstance[] {
    return Array.from(this.servers.values()).filter(
      (s) => s.config.tags?.includes(tag)
    );
  }

  /**
   * Get servers by capability
   */
  getServersByCapability(capability: keyof MCPMetadata['capabilities']): MCPServerInstance[] {
    return Array.from(this.servers.values()).filter(
      (s) => s.metadata?.capabilities[capability]
    );
  }

  /**
   * Get all tools from all connected servers
   */
  getAllTools(): Record<string, unknown> {
    const allTools: Record<string, unknown> = {};

    for (const instance of this.servers.values()) {
      if (instance.status === 'connected' && instance.tools) {
        // Namespace tools with server ID to avoid conflicts
        const namespace = instance.config.toolNamespace || `${instance.config.id}_`;

        for (const [toolName, toolDef] of Object.entries(instance.tools)) {
          const namespacedName = `${namespace}${toolName}`;
          allTools[namespacedName] = toolDef;
        }
      }
    }

    return allTools;
  }

  /**
   * Get tools from specific servers
   */
  getToolsFromServers(serverIds: string[]): Record<string, unknown> {
    const tools: Record<string, unknown> = {};

    for (const serverId of serverIds) {
      const instance = this.servers.get(serverId);
      if (instance && instance.status === 'connected' && instance.tools) {
        const namespace = instance.config.toolNamespace || `${instance.config.id}_`;

        for (const [toolName, toolDef] of Object.entries(instance.tools)) {
          const namespacedName = `${namespace}${toolName}`;
          tools[namespacedName] = toolDef;
        }
      }
    }

    return tools;
  }

  /**
   * Check if any server is connected
   */
  hasConnectedServers(): boolean {
    return Array.from(this.servers.values()).some((s) => s.status === 'connected');
  }

  /**
   * Get registry statistics
   */
  getStats(): MCPManagerStats {
    const servers = Array.from(this.servers.values());
    const connected = servers.filter((s) => s.status === 'connected');
    const disconnected = servers.filter((s) => s.status === 'disconnected');
    const totalTools = connected.reduce(
      (sum, s) => sum + Object.keys(s.tools).length,
      0
    );

    return {
      totalServers: servers.length,
      connectedServers: connected.length,
      disconnectedServers: disconnected.length,
      totalTools,
      cacheHitRate: 0, // Will be calculated by cache manager
      averageResponseTime: 0, // Will be calculated by telemetry
      errorRate: 0, // Will be calculated by telemetry
    };
  }

  /**
   * Register lifecycle event handler
   */
  on(event: MCPLifecycleHook, handler: MCPLifecycleHandler): void {
    if (!this.lifecycleHandlers.has(event)) {
      this.lifecycleHandlers.set(event, []);
    }
    this.lifecycleHandlers.get(event)!.push(handler);
  }

  /**
   * Unregister lifecycle event handler
   */
  off(event: MCPLifecycleHook, handler: MCPLifecycleHandler): void {
    const handlers = this.lifecycleHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit lifecycle event
   */
  private async emitLifecycleEvent(
    event: MCPLifecycleHook,
    serverId: string,
    data?: unknown,
    error?: Error
  ): Promise<void> {
    const handlers = this.lifecycleHandlers.get(event);
    if (!handlers || handlers.length === 0) return;

    const instance = this.servers.get(serverId);
    if (!instance) return;

    const context = {
      serverId,
      serverName: instance.config.name,
      event,
      data,
      error,
    };

    for (const handler of handlers) {
      try {
        await handler(context);
      } catch (err) {
        console.error('[MCP Registry] Lifecycle handler error:', err);
      }
    }
  }

  /**
   * Clear all servers (useful for testing)
   */
  clear(): void {
    this.servers.clear();
    this.lifecycleHandlers.clear();
    this.config = null;
    console.log('[MCP Registry] Cleared all servers');
  }

  /**
   * Export current configuration
   */
  exportConfig(): MCPRegistryConfig {
    return {
      version: this.config?.version || '1.0.0',
      servers: Array.from(this.servers.values()).map((s) => s.config),
      defaults: this.config?.defaults,
    };
  }
}

// Export singleton instance
export const mcpRegistry = MCPRegistry.getInstance();
