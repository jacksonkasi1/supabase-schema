/**
 * MCP Manager - Main orchestrator for the multi-MCP system
 * Provides high-level API for managing MCP servers, routing, and tool access
 */

import type {
  MCPRegistryConfig,
  MCPServerConfig,
  MCPServerInstance,
  MCPManagerStats,
  MCPRequestContext,
  MCPRoutingDecision,
  MCPLifecycleHandler,
  MCPLifecycleHook,
} from './types';
import { mcpRegistry } from './registry';
import { mcpConnectionManager } from './connection-manager';
import { mcpRouter } from './router';
import { loadMCPConfig } from './config';

/**
 * MCP Manager initialization options
 */
export interface MCPManagerOptions {
  config?: MCPRegistryConfig;
  autoConnect?: boolean;
  loadUserConfig?: boolean;
}

/**
 * MCP Manager - High-level API for MCP system
 */
export class MCPManager {
  private static instance: MCPManager | null = null;
  private initialized = false;
  private autoConnect = true;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  /**
   * Initialize the MCP system
   */
  async initialize(options: MCPManagerOptions = {}): Promise<void> {
    if (this.initialized) {
      console.warn('[MCP Manager] Already initialized');
      return;
    }

    console.log('[MCP Manager] Initializing...');

    try {
      // Load configuration
      let config: MCPRegistryConfig;
      if (options.config) {
        config = options.config;
      } else if (options.loadUserConfig !== false) {
        config = await loadMCPConfig();
      } else {
        const { DEFAULT_MCP_CONFIG } = await import('./config');
        config = DEFAULT_MCP_CONFIG;
      }

      // Initialize registry
      await mcpRegistry.initialize(config);

      // Set auto-connect preference
      this.autoConnect =
        options.autoConnect ?? config.defaults?.autoConnect ?? true;

      // Mark as initialized BEFORE connecting (to avoid circular dependency)
      this.initialized = true;

      // Auto-connect if enabled
      if (this.autoConnect) {
        await this.connectAll();
      }

      console.log('[MCP Manager] Initialized successfully');
    } catch (error) {
      this.initialized = false; // Reset on error
      console.error('[MCP Manager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MCP Manager not initialized. Call initialize() first.');
    }
  }

  /**
   * Connect to all enabled servers
   */
  async connectAll(): Promise<Map<string, boolean>> {
    this.ensureInitialized();
    console.log('[MCP Manager] Connecting to all servers...');
    return await mcpConnectionManager.connectAll();
  }

  /**
   * Connect to specific server
   */
  async connect(serverId: string): Promise<boolean> {
    this.ensureInitialized();
    console.log('[MCP Manager] Connecting to server:', serverId);
    return await mcpConnectionManager.connect(serverId);
  }

  /**
   * Disconnect from specific server
   */
  async disconnect(serverId: string): Promise<void> {
    this.ensureInitialized();
    console.log('[MCP Manager] Disconnecting from server:', serverId);
    await mcpConnectionManager.disconnect(serverId);
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    this.ensureInitialized();
    console.log('[MCP Manager] Disconnecting from all servers...');
    await mcpConnectionManager.disconnectAll();
  }

  /**
   * Register a new MCP server
   */
  async registerServer(config: MCPServerConfig): Promise<void> {
    this.ensureInitialized();
    console.log('[MCP Manager] Registering server:', config.id);
    await mcpRegistry.registerServer(config);

    // Auto-connect if enabled
    if (this.autoConnect && config.enabled !== false) {
      await this.connect(config.id);
    }
  }

  /**
   * Unregister an MCP server
   */
  async unregisterServer(serverId: string): Promise<void> {
    this.ensureInitialized();
    console.log('[MCP Manager] Unregistering server:', serverId);
    await mcpRegistry.unregisterServer(serverId);
  }

  /**
   * Get server by ID
   */
  getServer(serverId: string): MCPServerInstance | undefined {
    this.ensureInitialized();
    return mcpRegistry.getServer(serverId);
  }

  /**
   * Get all servers
   */
  getAllServers(): MCPServerInstance[] {
    this.ensureInitialized();
    return mcpRegistry.getAllServers();
  }

  /**
   * Get connected servers
   */
  getConnectedServers(): MCPServerInstance[] {
    this.ensureInitialized();
    return mcpRegistry.getConnectedServers();
  }

  /**
   * Get servers by tag
   */
  getServersByTag(tag: string): MCPServerInstance[] {
    this.ensureInitialized();
    return mcpRegistry.getServersByTag(tag);
  }

  /**
   * Get all tools from all connected servers
   */
  getAllTools(): Record<string, unknown> {
    this.ensureInitialized();
    return mcpRegistry.getAllTools();
  }

  /**
   * Get tools from specific servers
   */
  getToolsFromServers(serverIds: string[]): Record<string, unknown> {
    this.ensureInitialized();
    return mcpRegistry.getToolsFromServers(serverIds);
  }

  /**
   * Get tools based on routing decision
   */
  getToolsForRequest(context: MCPRequestContext): {
    tools: Record<string, unknown>;
    decision: MCPRoutingDecision;
    useMCP: boolean;
  } {
    this.ensureInitialized();

    // Route the request
    const decision = mcpRouter.route(context);

    // Log decision (optional, can be controlled via config)
    mcpRouter.logDecision(context, decision);

    // Get appropriate tools
    let tools: Record<string, unknown> = {};
    if (decision.useMCP && decision.preferredServers.length > 0) {
      tools = this.getToolsFromServers(decision.preferredServers);
    }

    return {
      tools,
      decision,
      useMCP: decision.useMCP,
    };
  }

  /**
   * Clean message by removing MCP commands
   */
  cleanMessage(message: string): string {
    return mcpRouter.cleanMessage(message);
  }

  /**
   * Check if any server is connected
   */
  hasConnectedServers(): boolean {
    this.ensureInitialized();
    return mcpRegistry.hasConnectedServers();
  }

  /**
   * Get manager statistics
   */
  getStats(): MCPManagerStats {
    this.ensureInitialized();
    return mcpRegistry.getStats();
  }

  /**
   * Register lifecycle event handler
   */
  on(event: MCPLifecycleHook, handler: MCPLifecycleHandler): void {
    this.ensureInitialized();
    mcpRegistry.on(event, handler);
  }

  /**
   * Unregister lifecycle event handler
   */
  off(event: MCPLifecycleHook, handler: MCPLifecycleHandler): void {
    this.ensureInitialized();
    mcpRegistry.off(event, handler);
  }

  /**
   * Export current configuration
   */
  exportConfig(): MCPRegistryConfig {
    this.ensureInitialized();
    return mcpRegistry.exportConfig();
  }

  /**
   * Reload configuration and reconnect
   */
  async reload(config?: MCPRegistryConfig): Promise<void> {
    this.ensureInitialized();
    console.log('[MCP Manager] Reloading...');

    // Disconnect all
    await this.disconnectAll();

    // Clear registry
    mcpRegistry.clear();

    // Re-initialize
    this.initialized = false;
    await this.initialize({ config, autoConnect: this.autoConnect });
  }

  /**
   * Shutdown the MCP system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    console.log('[MCP Manager] Shutting down...');

    // Disconnect all servers
    await this.disconnectAll();

    // Cleanup connection manager
    await mcpConnectionManager.cleanup();

    // Clear registry
    mcpRegistry.clear();

    this.initialized = false;
    console.log('[MCP Manager] Shutdown complete');
  }

  /**
   * Health check - verify all servers are healthy
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    this.ensureInitialized();
    const servers = mcpRegistry.getConnectedServers();
    const results = new Map<string, boolean>();

    for (const server of servers) {
      try {
        // Simple health check - verify tools are still accessible
        const tools = server.tools;
        const isHealthy = Object.keys(tools).length > 0;
        results.set(server.config.id, isHealthy);

        if (!isHealthy) {
          console.warn(
            '[MCP Manager] Health check failed for',
            server.config.id,
          );
        }
      } catch (error) {
        console.error(
          '[MCP Manager] Health check error for',
          server.config.id,
          ':',
          error,
        );
        results.set(server.config.id, false);
      }
    }

    return results;
  }
}

/**
 * Singleton instance
 */
export const mcpManager = MCPManager.getInstance();

/**
 * Convenience functions
 */

/**
 * Initialize MCP system (must be called before using other functions)
 */
export async function initializeMCP(
  options?: MCPManagerOptions,
): Promise<void> {
  await mcpManager.initialize(options);
}

/**
 * Get MCP tools for a request
 */
export function getMCPToolsForRequest(context: MCPRequestContext): {
  tools: Record<string, unknown>;
  decision: MCPRoutingDecision;
  useMCP: boolean;
} {
  return mcpManager.getToolsForRequest(context);
}

/**
 * Get all MCP tools
 */
export function getAllMCPTools(): Record<string, unknown> {
  return mcpManager.getAllTools();
}

/**
 * Clean message
 */
export function cleanMCPMessage(message: string): string {
  return mcpManager.cleanMessage(message);
}

/**
 * Check if MCP is available
 */
export function isMCPAvailable(): boolean {
  return mcpManager.isInitialized() && mcpManager.hasConnectedServers();
}

/**
 * Shutdown MCP
 */
export async function shutdownMCP(): Promise<void> {
  await mcpManager.shutdown();
}
