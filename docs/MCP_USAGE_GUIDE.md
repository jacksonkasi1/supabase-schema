# MCP Usage Guide

## Introduction

This guide covers everything you need to know about using the Model Context Protocol (MCP) integration in Tiger SQL. The MCP system provides the AI assistant with up-to-date PostgreSQL knowledge and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [User Commands](#user-commands)
4. [Configuration](#configuration)
5. [Adding Custom MCP Servers](#adding-custom-mcp-servers)
6. [Built-in Servers](#built-in-servers)
7. [Advanced Usage](#advanced-usage)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What is MCP?

Model Context Protocol (MCP) is a standardized way for AI applications to connect to external knowledge sources and tools. In Tiger SQL, MCP provides:

- **Real-time PostgreSQL documentation** via semantic search
- **Curated best practices** for database design
- **Extension knowledge** (TimescaleDB, pgvector, PostGIS)
- **Always up-to-date information** (no stale training data)

### How It Works

```
User Request → MCP Router → MCP Servers → PostgreSQL Knowledge
                    ↓
            AI Assistant → Schema Tools → Visual Designer
```

1. **User sends a request** (e.g., "Design a multi-tenant schema")
2. **MCP Router analyzes** the request complexity
3. **MCP Servers are queried** for PostgreSQL best practices
4. **AI Assistant applies knowledge** to create production-quality schemas
5. **Schema tools execute** the design in your visual workspace

### Benefits

✅ **Better Schema Quality** - 4× more constraints, 55% more indexes
✅ **Modern Patterns** - Uses latest PostgreSQL features (PG17)
✅ **Production-Ready** - Follows industry best practices
✅ **Up-to-Date** - Always has current documentation
✅ **Extensible** - Add your own MCP servers

---

## Getting Started

### Automatic Operation

MCP is **enabled by default** and requires no configuration. When you start Tiger SQL:

1. The system automatically initializes MCP on the first request
2. Connects to the built-in `pg-aiguide` server
3. Makes tools available to the AI assistant

### Verifying MCP Status

Check the browser console (F12 → Console) for:

```
[MCP Manager] Initializing...
[MCP Registry] Initializing with 1 servers
[MCP Connection] Connected to pg-aiguide successfully with 3 tools
[MCP Manager] Initialized successfully
```

If you see these messages, MCP is working! 🎉

---

## User Commands

Control MCP behavior by including special commands in your messages:

### `[use-mcp]` or `[force-mcp]`

**Force the AI to use MCP** regardless of request complexity.

```
[use-mcp] Create a users table
```

Use when:
- You want to ensure best practices are applied
- You're learning and want to see MCP in action
- The AI skipped MCP when it should have used it

### `[skip-mcp]` or `[no-mcp]`

**Skip MCP and use direct execution** for faster responses.

```
[skip-mcp] Add a column called 'email' to users table
```

Use when:
- Making very simple, straightforward changes
- You know exactly what you want
- Speed is more important than best practices

### `[mcp-verbose]`

**Show detailed MCP queries** in the response.

```
[mcp-verbose] Design an e-commerce schema
```

Use when:
- Debugging MCP behavior
- Learning how MCP works
- Verifying which knowledge sources were consulted

### `[use-server:server-id]`

**Use a specific MCP server only.**

```
[use-server:pg-aiguide] How do I implement RLS?
```

Use when:
- You have multiple MCP servers configured
- You want knowledge from a specific source
- Testing a new MCP server

### `[exclude-server:server-id]`

**Exclude a specific MCP server.**

```
[exclude-server:pg-aiguide] Create a simple users table
```

Use when:
- A server is slow or unresponsive
- You want to test without a specific server
- Debugging server-specific issues

### Combining Commands

You can combine multiple commands:

```
[use-mcp] [mcp-verbose] Design a SaaS multi-tenant database
```

---

## Configuration

### Configuration File

Create `.mcp-config.json` in your project root to customize MCP behavior:

```json
{
  "version": "1.0.0",
  "servers": [
    {
      "id": "pg-aiguide",
      "name": "PostgreSQL AI Guide",
      "enabled": true,
      "priority": 100
    }
  ],
  "defaults": {
    "timeout": 10000,
    "retryAttempts": 2,
    "autoConnect": true
  }
}
```

### Environment Variables

Override configuration via environment variables:

```bash
# Custom config file path
MCP_CONFIG_PATH=./custom-mcp.json

# Disable built-in servers
MCP_DISABLE_BUILTIN=false

# Auto-connect on startup
MCP_AUTO_CONNECT=true

# Connection timeout (ms)
MCP_TIMEOUT=10000

# Number of retry attempts
MCP_RETRY_ATTEMPTS=2
```

### Configuration Precedence

1. **Environment Variables** (highest priority)
2. **User Config File** (`.mcp-config.json`)
3. **Built-in Defaults** (lowest priority)

---

## Adding Custom MCP Servers

### Via Configuration File (Recommended)

1. **Create `.mcp-config.json`:**

```json
{
  "version": "1.0.0",
  "servers": [
    {
      "id": "my-custom-mcp",
      "name": "My Custom MCP Server",
      "description": "Custom MCP for my organization",
      "transport": {
        "type": "http",
        "url": "https://mcp.example.com",
        "headers": {
          "Authorization": "Bearer YOUR_API_KEY"
        }
      },
      "enabled": true,
      "timeout": 10000,
      "retryAttempts": 2,
      "priority": 50,
      "tags": ["custom", "postgres"],
      "toolNamespace": "custom_",
      "capabilities": {
        "tools": true,
        "resources": false,
        "prompts": false,
        "elicitation": false
      }
    }
  ]
}
```

2. **Restart the application**

3. **Verify connection** in the console:

```
[MCP Connection] Connected to my-custom-mcp successfully
```

### Via Code (For Built-in Servers)

Edit `src/lib/mcp/config.ts`:

```typescript
export const BUILTIN_MCP_SERVERS: MCPServerConfig[] = [
  {
    id: 'pg-aiguide',
    // ... existing config
  },
  // Add your server here
  {
    id: 'my-builtin-server',
    name: 'My Built-in MCP Server',
    transport: {
      type: 'http',
      url: 'https://mcp.mycompany.com',
    },
    enabled: true,
    priority: 75,
    tags: ['builtin', 'postgres'],
    toolNamespace: 'mycompany_',
  },
];
```

### Transport Types

#### HTTP (Recommended for Production)

```json
{
  "transport": {
    "type": "http",
    "url": "https://mcp.example.com",
    "headers": {
      "Authorization": "Bearer TOKEN"
    }
  }
}
```

#### SSE (Server-Sent Events)

```json
{
  "transport": {
    "type": "sse",
    "url": "https://mcp.example.com/sse"
  }
}
```

#### Stdio (Local Development Only)

```json
{
  "transport": {
    "type": "stdio",
    "command": "node",
    "args": ["path/to/mcp-server.js"],
    "env": {
      "NODE_ENV": "development"
    }
  }
}
```

⚠️ **Warning:** Stdio transport cannot be deployed to production (Vercel, Netlify, etc.)

---

## Built-in Servers

### pg-aiguide

**Provider:** Timescale  
**URL:** https://mcp.tigerdata.com/docs  
**GitHub:** https://github.com/timescale/pg-aiguide

#### Available Tools

1. **`pg_semantic_search_postgres_docs`**
   - Search official PostgreSQL documentation
   - Version-aware (supports PG 12-17)
   - Returns relevant documentation sections

2. **`pg_semantic_search_tiger_docs`**
   - Search TimescaleDB documentation
   - Extension ecosystem knowledge
   - Time-series best practices

3. **`pg_view_skill`**
   - Curated PostgreSQL best practices
   - Schema design patterns
   - Indexing strategies
   - Data integrity guidelines

#### Example Queries

```
Design a time-series database for IoT sensors
→ Uses: pg_view_skill + pg_semantic_search_tiger_docs

How do I implement Row Level Security?
→ Uses: pg_semantic_search_postgres_docs

What's the best way to partition large tables?
→ Uses: pg_view_skill + pg_semantic_search_postgres_docs
```

#### Tags

`postgres`, `database`, `sql`, `timescale`, `ai`

---

## Advanced Usage

### Programmatic Access

If you're building on top of Tiger SQL:

```typescript
import {
  initializeMCP,
  getMCPToolsForRequest,
  mcpManager,
} from '@/lib/mcp';

// Initialize MCP
await initializeMCP({ autoConnect: true });

// Get tools for a request
const { tools, decision } = getMCPToolsForRequest({
  userMessage: 'Design a schema...',
  schemaState: currentSchema,
});

// Use with AI agent
const allTools = { ...myTools, ...tools };
await agent.stream({ tools: allTools });

// Get statistics
const stats = mcpManager.getStats();
console.log('Connected servers:', stats.connectedServers);
```

### Monitoring MCP

```typescript
import { mcpManager } from '@/lib/mcp';

// Listen to lifecycle events
mcpManager.on('afterConnect', ({ serverId, serverName }) => {
  console.log(`Connected to ${serverName}`);
});

mcpManager.on('onError', ({ serverId, error }) => {
  console.error(`Error in ${serverId}:`, error);
});

// Health check
const health = await mcpManager.healthCheck();
for (const [serverId, isHealthy] of health) {
  console.log(`${serverId}: ${isHealthy ? '✓' : '✗'}`);
}
```

### Dynamic Server Management

```typescript
import { mcpManager } from '@/lib/mcp';

// Register a new server at runtime
await mcpManager.registerServer({
  id: 'runtime-server',
  name: 'Runtime MCP Server',
  transport: {
    type: 'http',
    url: 'https://mcp.example.com',
  },
  enabled: true,
  priority: 50,
  tags: ['runtime'],
  toolNamespace: 'runtime_',
});

// Unregister a server
await mcpManager.unregisterServer('runtime-server');

// Reload configuration
await mcpManager.reload();
```

---

## Troubleshooting

### MCP Not Connecting

**Symptoms:**
```
[MCP Connection] Failed to connect to pg-aiguide
[MCP Registry] 0 connected servers
```

**Solutions:**

1. **Check internet connection** - MCP requires network access
2. **Verify URL** - Ensure `https://mcp.tigerdata.com/docs` is accessible
3. **Check browser console** - Look for CORS or network errors
4. **Increase timeout:**
   ```json
   {
     "defaults": {
       "timeout": 30000
     }
   }
   ```

### MCP Tools Not Available

**Symptoms:**
- AI doesn't use PostgreSQL best practices
- No MCP tools in console logs

**Solutions:**

1. **Check initialization:**
   ```
   [MCP Manager] Initialized successfully
   ```

2. **Verify tools were fetched:**
   ```
   [api/chat] Total tools available: 15 { atomic: 12, mcp: 3 }
   ```

3. **Force MCP usage:**
   ```
   [use-mcp] Create a users table
   ```

### Slow Responses

**Symptoms:**
- Requests take > 5 seconds
- Timeout errors

**Solutions:**

1. **Reduce timeout:**
   ```bash
   MCP_TIMEOUT=5000
   ```

2. **Skip MCP for simple tasks:**
   ```
   [skip-mcp] Add a column
   ```

3. **Check server status:**
   ```typescript
   const stats = mcpManager.getStats();
   console.log('Average response time:', stats.averageResponseTime);
   ```

### Configuration Not Loading

**Symptoms:**
- Custom servers don't appear
- Config changes ignored

**Solutions:**

1. **Verify file location:**
   ```bash
   ls -la .mcp-config.json
   ```

2. **Check JSON syntax:**
   ```bash
   cat .mcp-config.json | jq .
   ```

3. **Set explicit path:**
   ```bash
   MCP_CONFIG_PATH=/absolute/path/to/.mcp-config.json
   ```

4. **Restart the application**

### CORS Errors

**Symptoms:**
```
Access to fetch at 'https://mcp.example.com' blocked by CORS
```

**Solutions:**

1. **Contact MCP provider** - They need to enable CORS
2. **Use proxy** - Set up a proxy server
3. **Stdio transport** - For local development only

---

## Best Practices

### When to Use MCP

✅ **Always use MCP for:**
- New schema design
- Complex queries
- Performance optimization
- Security implementations (RLS, policies)
- Multi-tenant architectures
- Time-series databases

✅ **Consider using MCP for:**
- Adding indexes
- Choosing data types
- Constraint decisions
- Naming conventions

❌ **Skip MCP for:**
- Simple column additions
- Renaming tables
- Listing tables
- Deleting columns
- Basic CRUD operations

### Server Priority

Set priorities to control which servers are consulted first:

- **100+** - Primary knowledge sources (e.g., pg-aiguide)
- **50-99** - Secondary sources (e.g., custom docs)
- **1-49** - Experimental or fallback servers

### Tool Namespacing

Always use unique namespaces to avoid conflicts:

```json
{
  "id": "my-server",
  "toolNamespace": "myserver_"
}
```

This prefixes all tools: `myserver_semantic_search`, `myserver_view_skill`

### Error Handling

MCP is designed for graceful degradation:

- If MCP fails, the AI continues with built-in knowledge
- No MCP errors block the user interface
- All failures are logged for debugging

---

## Example Workflows

### Workflow 1: E-commerce Schema Design

```
User: Design a complete e-commerce database schema

AI Process:
1. Analyzes request → "design" category, high complexity
2. Queries pg_view_skill("e-commerce-patterns")
3. Searches pg_semantic_search_postgres_docs("foreign keys best practices")
4. Creates tables with learned patterns:
   - products (with proper indexes)
   - orders (with status constraints)
   - order_items (with FK constraints)
   - payments (with audit fields)
   - customers (with email validation)
```

### Workflow 2: Performance Question

```
User: How should I index a table with millions of rows?

AI Process:
1. Analyzes request → "question" category
2. Queries pg_semantic_search_postgres_docs("indexing large tables")
3. Returns documentation + recommendations
4. No schema changes (question only)
```

### Workflow 3: Simple Modification

```
User: Add a 'phone' column to the users table

AI Process:
1. Analyzes request → "modify" category, simple
2. Skips MCP (too simple)
3. Uses addColumn tool directly
4. Fast response
```

---

## FAQ

### Q: Does MCP slow down the AI?

**A:** Only for complex tasks. The router automatically skips MCP for simple requests.

### Q: Can I use MCP offline?

**A:** No, MCP requires internet access to query servers. The app works offline but without MCP benefits.

### Q: How many MCP servers can I connect to?

**A:** Unlimited. The architecture supports any number of servers.

### Q: Does MCP use my API keys?

**A:** No, MCP servers are public services. Your OpenAI/Google keys are only for the AI assistant.

### Q: Can I self-host MCP servers?

**A:** Yes! Follow the [MCP Server Development Guide](https://github.com/modelcontextprotocol/servers) to create your own.

### Q: Is pg-aiguide free?

**A:** Yes, pg-aiguide is free and open-source by Timescale.

### Q: Can I disable MCP?

**A:** Yes, set `MCP_DISABLE_BUILTIN=true` or use `[skip-mcp]` for all requests.

### Q: What if a server goes down?

**A:** The app continues working without that server. Errors are logged but don't break functionality.

---

## Resources

- **MCP Specification:** https://github.com/modelcontextprotocol/specification
- **Vercel AI SDK MCP Docs:** https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
- **pg-aiguide GitHub:** https://github.com/timescale/pg-aiguide
- **Architecture Details:** [MCP_INTEGRATION_PLAN.md](./MCP_INTEGRATION_PLAN.md)

---

## Support

Need help with MCP?

1. Check the [Troubleshooting](#troubleshooting) section
2. Review browser console logs
3. Open an issue on [GitHub](https://github.com/jacksonkasi1/tiger-sql/issues)
4. Join the [Discussions](https://github.com/jacksonkasi1/tiger-sql/discussions)

---

**Happy Schema Designing with MCP! 🚀**