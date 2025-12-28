/**
 * MCP (Model Context Protocol) Integration
 *
 * A scalable, multi-server MCP architecture for AI-powered applications.
 *
 * Features:
 * - Multiple MCP server support
 * - Configuration-driven setup
 * - Intelligent request routing
 * - Connection management with health checks
 * - Tool namespacing to avoid conflicts
 * - Lifecycle hooks and telemetry
 *
 * @example
 * ```typescript
 * import { initializeMCP, getMCPToolsForRequest } from '@/lib/mcp';
 *
 * // Initialize the MCP system
 * await initializeMCP({ autoConnect: true });
 *
 * // Get tools for a specific request
 * const { tools, decision } = getMCPToolsForRequest({
 *   userMessage: 'Design a schema for an e-commerce app',
 * });
 *
 * // Use tools in your AI agent
 * const allTools = { ...atomicTools, ...tools };
 * ```
 */

// Core types
export type {
  MCPTransportType,
  MCPHTTPTransportConfig,
  MCPStdioTransportConfig,
  MCPTransportConfig,
  MCPCapabilities,
  MCPMetadata,
  MCPServerConfig,
  MCPConnectionStatus,
  MCPServerInstance,
  MCPRegistryConfig,
  MCPRoutingDecision,
  MCPRequestContext,
  MCPUserPreference,
  MCPTelemetryEvent,
  MCPToolMetadata,
  MCPCacheEntry,
  MCPManagerStats,
  MCPLifecycleHook,
  MCPLifecycleHandler,
} from './types';

// Registry
export { MCPRegistry, mcpRegistry } from './registry';

// Connection Manager
export {
  MCPConnectionManager,
  mcpConnectionManager,
  type MCPConnectionOptions,
} from './connection-manager';

// Configuration
export {
  BUILTIN_MCP_SERVERS,
  DEFAULT_MCP_CONFIG,
  MCP_ENV_KEYS,
  MCP_CONFIG_PATHS,
  loadMCPConfig,
  getServerConfig,
  addServerToConfig,
  removeServerFromConfig,
  toggleServerInConfig,
  exportConfigToJSON,
  saveConfigToFile,
  createExampleConfig,
} from './config';

// Router
export {
  MCPRouter,
  mcpRouter,
  routeRequest,
  parseUserPreference,
  cleanMessage,
  type RequestAnalysis,
} from './router';

// Manager (main API)
export {
  MCPManager,
  mcpManager,
  initializeMCP,
  getMCPToolsForRequest,
  getAllMCPTools,
  cleanMCPMessage,
  isMCPAvailable,
  shutdownMCP,
  type MCPManagerOptions,
} from './manager';

/**
 * Quick Start Guide:
 *
 * 1. Initialize the system:
 *    await initializeMCP({ autoConnect: true });
 *
 * 2. Get tools for a request:
 *    const { tools, decision } = getMCPToolsForRequest({
 *      userMessage: 'Design a schema...',
 *    });
 *
 * 3. Use with your AI agent:
 *    const allTools = { ...myTools, ...tools };
 *    await agent.stream({ tools: allTools });
 *
 * 4. Clean up when done:
 *    await shutdownMCP();
 *
 * Configuration:
 *
 * Create a `.mcp-config.json` file in your project root:
 * ```json
 * {
 *   "version": "1.0.0",
 *   "servers": [
 *     {
 *       "id": "my-server",
 *       "name": "My Custom MCP Server",
 *       "transport": {
 *         "type": "http",
 *         "url": "https://mcp.example.com"
 *       },
 *       "enabled": true,
 *       "priority": 50,
 *       "tags": ["custom"],
 *       "toolNamespace": "custom_"
 *     }
 *   ]
 * }
 * ```
 *
 * User Commands:
 *
 * Users can control MCP behavior using special commands in their messages:
 * - [use-mcp] - Force MCP usage
 * - [skip-mcp] - Skip MCP, use direct execution
 * - [mcp-verbose] - Show MCP queries in response
 * - [use-server:server-id] - Use specific server only
 * - [exclude-server:server-id] - Exclude specific server
 */
