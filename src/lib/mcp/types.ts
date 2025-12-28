/**
 * MCP Types and Configuration Schema
 * Defines the core types for a scalable multi-MCP architecture
 */

import type { z } from 'zod';

/**
 * Transport types supported by MCP
 */
export type MCPTransportType = 'http' | 'sse' | 'stdio';

/**
 * HTTP/SSE transport configuration
 */
export interface MCPHTTPTransportConfig {
  type: 'http' | 'sse';
  url: string;
  headers?: Record<string, string>;
  authProvider?: unknown; // OAuth provider if needed
}

/**
 * Stdio transport configuration (for local servers only)
 */
export interface MCPStdioTransportConfig {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Union of all transport configurations
 */
export type MCPTransportConfig = MCPHTTPTransportConfig | MCPStdioTransportConfig;

/**
 * MCP Server capabilities
 */
export interface MCPCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  elicitation?: boolean;
}

/**
 * MCP Server metadata
 */
export interface MCPMetadata {
  id: string; // Unique identifier (e.g., 'pg-aiguide', 'github-mcp')
  name: string; // Display name
  description: string;
  version?: string;
  author?: string;
  homepage?: string;
  tags?: string[]; // e.g., ['postgres', 'database', 'ai']
  capabilities: MCPCapabilities;
}

/**
 * MCP Server configuration (user-defined or code-defined)
 */
export interface MCPServerConfig {
  id: string;
  name: string;
  description?: string;
  transport: MCPTransportConfig;
  enabled?: boolean; // Allow users to enable/disable
  timeout?: number; // Connection timeout in ms
  retryAttempts?: number;
  priority?: number; // Higher priority MCPs checked first
  tags?: string[]; // For filtering and categorization
  toolNamespace?: string; // Prefix for tools (e.g., 'pg_', 'github_')
  capabilities?: MCPCapabilities;
}

/**
 * MCP connection status
 */
export type MCPConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'timeout';

/**
 * MCP Server instance (runtime state)
 */
export interface MCPServerInstance {
  config: MCPServerConfig;
  client: any; // MCP client instance
  tools: Record<string, unknown>;
  status: MCPConnectionStatus;
  error?: Error;
  connectedAt?: Date;
  lastUsedAt?: Date;
  metadata?: MCPMetadata;
}

/**
 * MCP Registry configuration (loaded from config file)
 */
export interface MCPRegistryConfig {
  version: string;
  servers: MCPServerConfig[];
  defaults?: {
    timeout?: number;
    retryAttempts?: number;
    autoConnect?: boolean;
  };
}

/**
 * Tool routing decision
 */
export interface MCPRoutingDecision {
  useMCP: boolean;
  preferredServers: string[]; // MCP IDs to prioritize
  reason: string;
  confidence: number; // 0-1
}

/**
 * Request context for MCP routing
 */
export interface MCPRequestContext {
  userMessage: string;
  messageHistory?: Array<{ role: string; content: string }>;
  schemaState?: Record<string, unknown>;
  userPreference?: MCPUserPreference;
}

/**
 * User preference for MCP usage
 */
export interface MCPUserPreference {
  mode: 'auto' | 'force' | 'skip' | 'verbose';
  preferredServers?: string[]; // Specific MCP IDs to use
  excludedServers?: string[]; // MCPs to exclude
  reason?: string;
}

/**
 * MCP analytics/telemetry data
 */
export interface MCPTelemetryEvent {
  timestamp: Date;
  serverId: string;
  eventType: 'tool_call' | 'connection' | 'error' | 'cache_hit' | 'cache_miss';
  duration?: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * MCP tool metadata (for display and filtering)
 */
export interface MCPToolMetadata {
  serverId: string;
  serverName: string;
  toolName: string;
  namespacedName: string; // e.g., 'pg_semantic_search'
  description?: string;
  inputSchema?: z.ZodTypeAny;
  category?: string;
  tags?: string[];
}

/**
 * Cache entry for MCP responses
 */
export interface MCPCacheEntry<T = unknown> {
  key: string;
  value: T;
  serverId: string;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
}

/**
 * MCP Manager statistics
 */
export interface MCPManagerStats {
  totalServers: number;
  connectedServers: number;
  disconnectedServers: number;
  totalTools: number;
  cacheHitRate: number;
  averageResponseTime: number;
  errorRate: number;
}

/**
 * Hook for MCP lifecycle events
 */
export type MCPLifecycleHook =
  | 'beforeConnect'
  | 'afterConnect'
  | 'beforeDisconnect'
  | 'afterDisconnect'
  | 'onError'
  | 'onToolCall';

export type MCPLifecycleHandler = (context: {
  serverId: string;
  serverName: string;
  event: MCPLifecycleHook;
  data?: unknown;
  error?: Error;
}) => void | Promise<void>;
