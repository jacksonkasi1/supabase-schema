/**
 * MCP Configuration Loader
 * Loads MCP server configurations from multiple sources:
 * 1. Built-in server definitions (pg-aiguide, etc.)
 * 2. User configuration file (.mcp-config.json)
 * 3. Environment variables
 * 4. Runtime API calls
 */

import type { MCPRegistryConfig, MCPServerConfig } from './types';

/**
 * Built-in MCP server definitions
 * These are pre-configured popular MCP servers
 */
export const BUILTIN_MCP_SERVERS: MCPServerConfig[] = [
  {
    id: 'pg-aiguide',
    name: 'PostgreSQL AI Guide',
    description:
      'AI-optimized PostgreSQL expertise with semantic search and best practices',
    transport: {
      type: 'http',
      url: 'https://mcp.tigerdata.com/docs',
    },
    enabled: true,
    timeout: 10000,
    retryAttempts: 2,
    priority: 100, // Highest priority for main PostgreSQL knowledge
    tags: ['postgres', 'database', 'sql', 'timescale', 'ai'],
    toolNamespace: 'pg_',
    capabilities: {
      tools: true,
      resources: true,
      prompts: false,
      elicitation: false,
    },
  },
  // Future servers can be added here:
  /*
  {
    id: 'github-mcp',
    name: 'GitHub MCP',
    description: 'GitHub API access via MCP',
    transport: {
      type: 'http',
      url: 'https://mcp.github.com',
    },
    enabled: false, // Disabled by default
    timeout: 8000,
    retryAttempts: 2,
    priority: 50,
    tags: ['github', 'git', 'vcs'],
    toolNamespace: 'github_',
    capabilities: {
      tools: true,
      resources: true,
      prompts: false,
      elicitation: false,
    },
  },
  {
    id: 'supabase-mcp',
    name: 'Supabase MCP',
    description: 'Supabase project management via MCP',
    transport: {
      type: 'http',
      url: 'https://mcp.supabase.com',
    },
    enabled: false,
    timeout: 8000,
    retryAttempts: 2,
    priority: 75,
    tags: ['supabase', 'postgres', 'database'],
    toolNamespace: 'supabase_',
    capabilities: {
      tools: true,
      resources: true,
      prompts: false,
      elicitation: false,
    },
  },
  */
];

/**
 * Default MCP registry configuration
 */
export const DEFAULT_MCP_CONFIG: MCPRegistryConfig = {
  version: '1.0.0',
  servers: BUILTIN_MCP_SERVERS,
  defaults: {
    timeout: 10000,
    retryAttempts: 2,
    autoConnect: true,
  },
};

/**
 * Environment variable keys for MCP configuration
 */
export const MCP_ENV_KEYS = {
  CONFIG_PATH: 'MCP_CONFIG_PATH',
  DISABLE_BUILTIN: 'MCP_DISABLE_BUILTIN',
  AUTO_CONNECT: 'MCP_AUTO_CONNECT',
  TIMEOUT: 'MCP_TIMEOUT',
  RETRY_ATTEMPTS: 'MCP_RETRY_ATTEMPTS',
} as const;

/**
 * User configuration file paths (checked in order)
 */
export const MCP_CONFIG_PATHS = [
  '.mcp-config.json',
  'mcp.config.json',
  'config/mcp.json',
];

/**
 * Load MCP configuration from multiple sources
 */
export async function loadMCPConfig(): Promise<MCPRegistryConfig> {
  // Start with default config
  let config: MCPRegistryConfig = { ...DEFAULT_MCP_CONFIG };

  // 1. Check if built-in servers should be disabled
  const disableBuiltin = process.env[MCP_ENV_KEYS.DISABLE_BUILTIN] === 'true';
  if (disableBuiltin) {
    console.log('[MCP Config] Built-in servers disabled via environment');
    config.servers = [];
  }

  // 2. Load user configuration file
  const userConfig = await loadUserConfig();
  if (userConfig) {
    config = mergeConfigs(config, userConfig);
  }

  // 3. Apply environment variable overrides
  config = applyEnvironmentOverrides(config);

  // 4. Validate configuration
  validateConfig(config);

  console.log(
    '[MCP Config] Loaded configuration with',
    config.servers.length,
    'servers',
  );
  return config;
}

/**
 * Load user configuration from file
 */
async function loadUserConfig(): Promise<MCPRegistryConfig | null> {
  // Check custom path from environment
  const customPath = process.env[MCP_ENV_KEYS.CONFIG_PATH];
  if (customPath) {
    const config = await loadConfigFromPath(customPath);
    if (config) return config;
  }

  // Check default paths
  for (const path of MCP_CONFIG_PATHS) {
    const config = await loadConfigFromPath(path);
    if (config) return config;
  }

  return null;
}

/**
 * Load configuration from a specific path
 */
async function loadConfigFromPath(
  path: string,
): Promise<MCPRegistryConfig | null> {
  try {
    // Try to dynamically import the config file
    // Note: This works in Node.js environment
    const fs = await import('fs').then((m) => m.promises);
    const configContent = await fs.readFile(path, 'utf-8');
    const config = JSON.parse(configContent) as MCPRegistryConfig;
    console.log('[MCP Config] Loaded user config from', path);
    return config;
  } catch (error) {
    // File not found or invalid JSON - this is expected, not an error
    return null;
  }
}

/**
 * Merge two configurations
 * User config takes precedence over default config
 */
function mergeConfigs(
  defaultConfig: MCPRegistryConfig,
  userConfig: Partial<MCPRegistryConfig>,
): MCPRegistryConfig {
  const merged: MCPRegistryConfig = {
    version: userConfig.version || defaultConfig.version,
    servers: [...defaultConfig.servers],
    defaults: {
      ...defaultConfig.defaults,
      ...userConfig.defaults,
    },
  };

  // Merge user servers
  if (userConfig.servers && Array.isArray(userConfig.servers)) {
    for (const userServer of userConfig.servers) {
      // Check if server already exists (by id)
      const existingIndex = merged.servers.findIndex(
        (s) => s.id === userServer.id,
      );

      if (existingIndex >= 0) {
        // Override existing server
        merged.servers[existingIndex] = {
          ...merged.servers[existingIndex],
          ...userServer,
        };
        console.log('[MCP Config] Overriding server:', userServer.id);
      } else {
        // Add new server
        merged.servers.push(userServer);
        console.log('[MCP Config] Adding user server:', userServer.id);
      }
    }
  }

  return merged;
}

/**
 * Apply environment variable overrides
 */
function applyEnvironmentOverrides(
  config: MCPRegistryConfig,
): MCPRegistryConfig {
  // Override defaults from environment
  if (process.env[MCP_ENV_KEYS.AUTO_CONNECT]) {
    config.defaults!.autoConnect =
      process.env[MCP_ENV_KEYS.AUTO_CONNECT] === 'true';
  }

  if (process.env[MCP_ENV_KEYS.TIMEOUT]) {
    const timeoutStr = process.env[MCP_ENV_KEYS.TIMEOUT];
    if (timeoutStr) {
      const timeout = parseInt(timeoutStr, 10);
      if (!isNaN(timeout)) {
        config.defaults!.timeout = timeout;
      }
    }
  }

  if (process.env[MCP_ENV_KEYS.RETRY_ATTEMPTS]) {
    const retriesStr = process.env[MCP_ENV_KEYS.RETRY_ATTEMPTS];
    if (retriesStr) {
      const retries = parseInt(retriesStr, 10);
      if (!isNaN(retries)) {
        config.defaults!.retryAttempts = retries;
      }
    }
  }

  return config;
}

/**
 * Validate configuration
 */
function validateConfig(config: MCPRegistryConfig): void {
  if (!config.version) {
    throw new Error('MCP config missing version');
  }

  if (!Array.isArray(config.servers)) {
    throw new Error('MCP config servers must be an array');
  }

  // Validate each server
  for (const server of config.servers) {
    if (!server.id || typeof server.id !== 'string') {
      throw new Error('MCP server missing or invalid id');
    }

    if (!server.name || typeof server.name !== 'string') {
      throw new Error(`MCP server ${server.id} missing or invalid name`);
    }

    if (!server.transport || typeof server.transport !== 'object') {
      throw new Error(`MCP server ${server.id} missing or invalid transport`);
    }

    if (!['http', 'sse', 'stdio'].includes(server.transport.type)) {
      throw new Error(
        `MCP server ${server.id} has invalid transport type: ${server.transport.type}`,
      );
    }

    if (
      (server.transport.type === 'http' || server.transport.type === 'sse') &&
      !server.transport.url
    ) {
      throw new Error(`MCP server ${server.id} missing transport URL`);
    }

    if (server.transport.type === 'stdio' && !server.transport.command) {
      throw new Error(`MCP server ${server.id} missing stdio command`);
    }
  }

  console.log('[MCP Config] Configuration validated successfully');
}

/**
 * Get server configuration by ID
 */
export function getServerConfig(
  config: MCPRegistryConfig,
  serverId: string,
): MCPServerConfig | undefined {
  return config.servers.find((s) => s.id === serverId);
}

/**
 * Add server to configuration
 */
export function addServerToConfig(
  config: MCPRegistryConfig,
  server: MCPServerConfig,
): MCPRegistryConfig {
  // Check if server already exists
  const existingIndex = config.servers.findIndex((s) => s.id === server.id);

  if (existingIndex >= 0) {
    // Replace existing
    config.servers[existingIndex] = server;
  } else {
    // Add new
    config.servers.push(server);
  }

  return config;
}

/**
 * Remove server from configuration
 */
export function removeServerFromConfig(
  config: MCPRegistryConfig,
  serverId: string,
): MCPRegistryConfig {
  config.servers = config.servers.filter((s) => s.id !== serverId);
  return config;
}

/**
 * Enable/disable server in configuration
 */
export function toggleServerInConfig(
  config: MCPRegistryConfig,
  serverId: string,
  enabled: boolean,
): MCPRegistryConfig {
  const server = config.servers.find((s) => s.id === serverId);
  if (server) {
    server.enabled = enabled;
  }
  return config;
}

/**
 * Export configuration to JSON
 */
export function exportConfigToJSON(config: MCPRegistryConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Save configuration to file
 */
export async function saveConfigToFile(
  config: MCPRegistryConfig,
  path: string = '.mcp-config.json',
): Promise<void> {
  try {
    const fs = await import('fs').then((m) => m.promises);
    const json = exportConfigToJSON(config);
    await fs.writeFile(path, json, 'utf-8');
    console.log('[MCP Config] Saved configuration to', path);
  } catch (error) {
    console.error('[MCP Config] Failed to save configuration:', error);
    throw error;
  }
}

/**
 * Create example configuration file
 */
export function createExampleConfig(): MCPRegistryConfig {
  return {
    version: '1.0.0',
    servers: [
      {
        id: 'my-custom-mcp',
        name: 'My Custom MCP Server',
        description: 'Custom MCP server for my organization',
        transport: {
          type: 'http',
          url: 'https://mcp.example.com',
        },
        enabled: true,
        timeout: 10000,
        retryAttempts: 2,
        priority: 80,
        tags: ['custom', 'example'],
        toolNamespace: 'custom_',
        capabilities: {
          tools: true,
          resources: false,
          prompts: false,
          elicitation: false,
        },
      },
    ],
    defaults: {
      timeout: 10000,
      retryAttempts: 2,
      autoConnect: true,
    },
  };
}
