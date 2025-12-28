/**
 * MCP Router - Intelligent tool selection and routing for multi-MCP architecture
 * Analyzes requests and routes to appropriate MCP servers based on context
 */

import type {
  MCPRoutingDecision,
  MCPRequestContext,
  MCPUserPreference,
} from './types';
import { mcpRegistry } from './registry';

/**
 * Request analysis result
 */
export interface RequestAnalysis {
  requiresMCPKnowledge: boolean;
  suggestedServers: string[]; // MCP server IDs
  suggestedTools: string[]; // Specific tool names
  complexity: 'simple' | 'moderate' | 'complex';
  category: 'design' | 'query' | 'modify' | 'question' | 'unknown';
  confidence: number; // 0-1
  tags: string[]; // Relevant tags for filtering servers
}

/**
 * Keywords for different request categories
 */
const KNOWLEDGE_KEYWORDS = [
  'best practice',
  'recommend',
  'should i',
  'how to',
  'design',
  'architecture',
  'pattern',
  'optimize',
  'index',
  'performance',
  'constraint',
  'normalize',
  'partition',
  'security',
  'audit',
  'trigger',
  'function',
  'procedure',
  'view',
  'materialized',
  'jsonb',
  'array',
  'enum',
  'domain',
  'extension',
  'timescaledb',
  'postgis',
  'pgvector',
  'citus',
  'multi-tenant',
  'sharding',
  'replication',
  'backup',
];

const DESIGN_KEYWORDS = [
  'create schema',
  'design',
  'build',
  'implement',
  'e-commerce',
  'blog',
  'cms',
  'social',
  'analytics',
  'inventory',
  'booking',
  'reservation',
  'marketplace',
  'saas',
  'multi-tenant',
];

const SIMPLE_KEYWORDS = [
  'add column',
  'remove column',
  'rename table',
  'drop table',
  'list tables',
  'show schema',
  'delete',
  'update',
];

const QUESTION_KEYWORDS = [
  'what is',
  'how does',
  'explain',
  'difference between',
  'when to use',
  'why',
  'pros and cons',
];

/**
 * MCP Router - Main routing logic
 */
export class MCPRouter {
  private static instance: MCPRouter | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): MCPRouter {
    if (!MCPRouter.instance) {
      MCPRouter.instance = new MCPRouter();
    }
    return MCPRouter.instance;
  }

  /**
   * Analyze user request to determine routing strategy
   */
  analyzeRequest(context: MCPRequestContext): RequestAnalysis {
    const message = context.userMessage.toLowerCase().trim();

    // Count keyword matches
    const knowledgeMatches = this._countMatches(message, KNOWLEDGE_KEYWORDS);
    const designMatches = this._countMatches(message, DESIGN_KEYWORDS);
    const simpleMatches = this._countMatches(message, SIMPLE_KEYWORDS);
    const questionMatches = this._countMatches(message, QUESTION_KEYWORDS);

    // Determine category and complexity
    let category: RequestAnalysis['category'] = 'unknown';
    let complexity: RequestAnalysis['complexity'] = 'moderate';
    let requiresMCPKnowledge = false;
    let suggestedServers: string[] = [];
    let suggestedTools: string[] = [];
    let confidence = 0.5;
    let tags: string[] = [];

    // High confidence for clear design tasks
    if (designMatches > 0 || knowledgeMatches >= 2) {
      category = 'design';
      complexity = 'complex';
      requiresMCPKnowledge = true;
      tags = ['postgres', 'database', 'design'];
      confidence = Math.min(
        0.9,
        0.6 + (designMatches + knowledgeMatches) * 0.1,
      );
    }
    // Questions about PostgreSQL
    else if (questionMatches > 0 || knowledgeMatches > 0) {
      category = 'question';
      complexity = 'moderate';
      requiresMCPKnowledge = true;
      tags = ['postgres', 'database'];
      confidence = 0.8;
    }
    // Simple modifications - still include MCP for context
    else if (simpleMatches > 0 && message.length < 100) {
      category = 'modify';
      complexity = 'simple';
      // Changed: Include MCP even for simple tasks - model can decide whether to use it
      requiresMCPKnowledge = true;
      tags = ['postgres', 'database'];
      confidence = 0.7;
    }
    // Query/list operations - still include MCP for context
    else if (
      message.includes('list') ||
      message.includes('show') ||
      message.includes('get')
    ) {
      category = 'query';
      complexity = 'simple';
      // Changed: Include MCP even for queries - provides better context
      requiresMCPKnowledge = true;
      tags = ['postgres', 'database'];
      confidence = 0.8;
    }
    // Default: Include MCP tools for any database-related context
    else {
      category = 'unknown';
      complexity = 'moderate';
      // Changed: Default to including MCP - let the model decide what tools to use
      requiresMCPKnowledge = true;
      tags = ['postgres', 'database'];
      confidence = 0.6;
    }

    // Special case: very short messages are likely simple
    // But still include MCP tools - model can choose not to use them
    if (message.length < 50 && simpleMatches > 0) {
      // Keep requiresMCPKnowledge = true, just mark as simple
      complexity = 'simple';
      confidence = 0.9;
    }

    // Special case: contains specific PostgreSQL terms - boost confidence
    if (message.includes('postgres') || message.includes('database')) {
      tags.push('postgres', 'database');
      confidence = Math.max(confidence, 0.85);
    }

    // Ensure tags are unique
    tags = [...new Set(tags)];

    // Find suggested servers based on tags
    if (requiresMCPKnowledge && tags.length > 0) {
      suggestedServers = this._findServersByTags(tags);

      // Suggest specific tools based on category
      if (category === 'design') {
        suggestedTools = ['semantic_search_postgres_docs', 'view_skill'];
      } else if (category === 'question') {
        suggestedTools = ['semantic_search_postgres_docs'];
      }
    }

    return {
      requiresMCPKnowledge,
      suggestedServers,
      suggestedTools,
      complexity,
      category,
      confidence,
      tags,
    };
  }

  /**
   * Parse user MCP preference from message
   */
  parseUserPreference(message: string): MCPUserPreference {
    const cleanMessage = message.toLowerCase();

    // Check for force commands
    if (
      cleanMessage.includes('[use-mcp]') ||
      cleanMessage.includes('[force-mcp]')
    ) {
      return {
        mode: 'force',
        reason: 'User explicitly requested MCP usage',
      };
    }

    // Check for skip commands
    if (
      cleanMessage.includes('[skip-mcp]') ||
      cleanMessage.includes('[no-mcp]')
    ) {
      return {
        mode: 'skip',
        reason: 'User requested to skip MCP',
      };
    }

    // Check for verbose commands
    if (
      cleanMessage.includes('[mcp-verbose]') ||
      cleanMessage.includes('[verbose-mcp]')
    ) {
      return {
        mode: 'verbose',
        reason: 'User requested verbose MCP output',
      };
    }

    // Check for specific server preferences
    const serverMatch = cleanMessage.match(/\[use-server:([\w-]+)\]/);
    if (serverMatch) {
      return {
        mode: 'force',
        preferredServers: [serverMatch[1]],
        reason: `User requested specific server: ${serverMatch[1]}`,
      };
    }

    // Check for server exclusion
    const excludeMatch = cleanMessage.match(/\[exclude-server:([\w-]+)\]/);
    if (excludeMatch) {
      return {
        mode: 'auto',
        excludedServers: [excludeMatch[1]],
        reason: `User excluded server: ${excludeMatch[1]}`,
      };
    }

    return {
      mode: 'auto',
      reason: 'Default auto mode',
    };
  }

  /**
   * Clean message by removing MCP preference commands
   */
  cleanMessage(message: string): string {
    return message
      .replace(/\[use-mcp\]/gi, '')
      .replace(/\[force-mcp\]/gi, '')
      .replace(/\[skip-mcp\]/gi, '')
      .replace(/\[no-mcp\]/gi, '')
      .replace(/\[mcp-verbose\]/gi, '')
      .replace(/\[verbose-mcp\]/gi, '')
      .replace(/\[use-server:[\w-]+\]/gi, '')
      .replace(/\[exclude-server:[\w-]+\]/gi, '')
      .trim();
  }

  /**
   * Make final routing decision
   */
  route(context: MCPRequestContext): MCPRoutingDecision {
    const analysis = this.analyzeRequest(context);
    const userPreference =
      context.userPreference || this.parseUserPreference(context.userMessage);

    // User preference overrides analysis
    if (userPreference.mode === 'force') {
      const servers =
        userPreference.preferredServers || analysis.suggestedServers;
      return {
        useMCP: true,
        preferredServers:
          servers.length > 0 ? servers : this._getAllConnectedServerIds(),
        reason: userPreference.reason || 'User forced MCP usage',
        confidence: 1.0,
      };
    }

    if (userPreference.mode === 'skip') {
      return {
        useMCP: false,
        preferredServers: [],
        reason: userPreference.reason || 'User skipped MCP usage',
        confidence: 1.0,
      };
    }

    // Auto mode: Always include MCP tools when servers are connected
    // The model can decide which tools to use - atomic or MCP
    let servers = analysis.suggestedServers;

    // Apply user exclusions
    if (
      userPreference.excludedServers &&
      userPreference.excludedServers.length > 0
    ) {
      servers = servers.filter(
        (s) => !userPreference.excludedServers!.includes(s),
      );
    }

    // Apply user preferences
    if (
      userPreference.preferredServers &&
      userPreference.preferredServers.length > 0
    ) {
      servers = userPreference.preferredServers;
    }

    // Fallback to all connected servers if no specific servers found
    if (servers.length === 0) {
      servers = this._getAllConnectedServerIds();
    }

    // Always use MCP if we have connected servers
    // This ensures MCP tools are available for the model to use when appropriate
    const hasConnectedServers = servers.length > 0;

    return {
      useMCP: hasConnectedServers,
      preferredServers: servers,
      reason: hasConnectedServers
        ? `Auto: MCP tools available for ${analysis.category} task (confidence: ${analysis.confidence})`
        : `Auto: No MCP servers connected, using atomic tools only`,
      confidence: analysis.confidence,
    };
  }

  /**
   * Log routing decision for debugging
   */
  logDecision(context: MCPRequestContext, decision: MCPRoutingDecision): void {
    const messagePreview =
      context.userMessage.substring(0, 100) +
      (context.userMessage.length > 100 ? '...' : '');

    console.log('[MCP Router] Routing decision:', {
      message: messagePreview,
      useMCP: decision.useMCP,
      servers: decision.preferredServers,
      reason: decision.reason,
      confidence: decision.confidence,
    });
  }

  /**
   * Helper: Count keyword matches in message
   */
  private _countMatches(message: string, keywords: string[]): number {
    return keywords.filter((keyword) => message.includes(keyword)).length;
  }

  /**
   * Helper: Find servers by tags
   */
  private _findServersByTags(tags: string[]): string[] {
    const servers: string[] = [];

    for (const tag of tags) {
      const taggedServers = mcpRegistry.getServersByTag(tag);
      for (const server of taggedServers) {
        if (
          server.status === 'connected' &&
          !servers.includes(server.config.id)
        ) {
          servers.push(server.config.id);
        }
      }
    }

    // Sort by priority (higher first)
    servers.sort((a, b) => {
      const serverA = mcpRegistry.getServer(a);
      const serverB = mcpRegistry.getServer(b);
      const priorityA = serverA?.config.priority || 0;
      const priorityB = serverB?.config.priority || 0;
      return priorityB - priorityA;
    });

    return servers;
  }

  /**
   * Helper: Get all connected server IDs
   */
  private _getAllConnectedServerIds(): string[] {
    return mcpRegistry.getConnectedServers().map((s) => s.config.id);
  }
}

// Export singleton instance
export const mcpRouter = MCPRouter.getInstance();

/**
 * Convenience function: Analyze and route request
 */
export function routeRequest(context: MCPRequestContext): MCPRoutingDecision {
  return mcpRouter.route(context);
}

/**
 * Convenience function: Parse user preference
 */
export function parseUserPreference(message: string): MCPUserPreference {
  return mcpRouter.parseUserPreference(message);
}

/**
 * Convenience function: Clean message
 */
export function cleanMessage(message: string): string {
  return mcpRouter.cleanMessage(message);
}
