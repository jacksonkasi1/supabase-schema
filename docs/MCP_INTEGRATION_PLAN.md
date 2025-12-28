# MCP Integration Development Plan

## Overview

This document outlines the development plan for integrating Model Context Protocol (MCP) into the Supabase Schema application. The goal is to leverage **pg-aiguide** (Timescale's PostgreSQL MCP server) to provide the AI agent with up-to-date PostgreSQL knowledge, best practices, and schema design patterns.

### Key Resources

- **Vercel AI SDK 6 MCP Documentation**: https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
- **pg-aiguide MCP Server**: https://mcp.tigerdata.com/docs
- **pg-aiguide GitHub**: https://github.com/timescale/pg-aiguide

### Why MCP Integration?

AI coding tools often generate Postgres code that is:
- Outdated
- Missing constraints and indexes
- Unaware of modern PG features
- Inconsistent with real-world best practices

**pg-aiguide** fixes this by providing:
- Semantic search across official PostgreSQL manual (version-aware)
- AI-optimized "skills" — curated, opinionated Postgres best practices
- Extension ecosystem docs (TimescaleDB, pgvector coming soon)

---

## Pre-Implementation Checklist

Before starting any development work, ensure the following checks pass:

### Required Checks (Must Pass Before Each Phase)

- [ ] **TypeScript Check**: `npm run typecheck` passes with zero errors
- [ ] **Lint Check**: `npm run lint` passes with zero errors/warnings
- [ ] **Build Check**: `npm run build` completes successfully
- [ ] **Development Server**: `npm run dev` starts without errors

### Environment Setup

- [ ] Node.js 18+ installed
- [ ] AI SDK 6.x (`ai` package) is already at version `^6.0.0` ✓
- [ ] Environment variables configured:
  - `OPENAI_API_KEY` (already in use)
  - `GOOGLE_GENERATIVE_AI_API_KEY` (already in use)

---

## Phase I: Core MCP Integration

### Goal
Integrate pg-aiguide MCP server as the primary PostgreSQL knowledge source for the AI agent.

### 1.1 Install MCP Dependencies

**Task**: Add required MCP packages to the project.

```bash
npm install @ai-sdk/mcp @modelcontextprotocol/sdk
```

**Files Modified**:
- `package.json`

**Acceptance Criteria**:
- [ ] Dependencies installed successfully
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

---

### 1.2 Create MCP Client Module

**Task**: Create a reusable MCP client module for connecting to pg-aiguide.

**New File**: `src/lib/mcp-client.ts`

```typescript
// Key implementation points:
// 1. Use HTTP transport (recommended for production)
// 2. Connect to pg-aiguide: https://mcp.tigerdata.com/docs
// 3. Export createPgAiGuideMCPClient function
// 4. Handle connection lifecycle (open/close)
```

**Key Features**:
- HTTP transport configuration
- Automatic reconnection handling
- Error boundary for MCP failures
- Graceful fallback when MCP is unavailable

**Acceptance Criteria**:
- [ ] MCP client connects successfully to pg-aiguide
- [ ] Client properly closes after use
- [ ] Error handling for network failures
- [ ] TypeScript types exported

---

### 1.3 Integrate MCP Tools into Chat API

**Task**: Modify the chat API route to include MCP tools alongside existing atomic tools.

**File Modified**: `src/app/api/chat/route.ts`

**Implementation Strategy**:

```typescript
// 1. Create MCP client at request start
const mcpClient = await createMCPClient({
  transport: {
    type: 'http',
    url: 'https://mcp.tigerdata.com/docs',
  },
});

// 2. Get MCP tools (pg-aiguide tools)
const mcpTools = await mcpClient.tools();

// 3. Merge with existing atomic tools
const allTools = {
  ...createAtomicTools(),  // existing schema manipulation tools
  ...mcpTools,              // pg-aiguide semantic search + skills
};

// 4. Close client on stream finish
onFinish: async () => {
  await mcpClient.close();
}
```

**Acceptance Criteria**:
- [ ] MCP tools available to the agent
- [ ] Existing atomic tools still function
- [ ] MCP client properly closed after response
- [ ] No memory leaks

---

### 1.4 Update System Prompt for MCP-First Approach

**Task**: Modify the system prompt to instruct the agent to use MCP tools by default.

**File Modified**: `src/app/api/chat/route.ts` (SYSTEM_PROMPT constant)

**New Prompt Section**:

```
**MCP TOOL USAGE (PRIORITY)**
You have access to PostgreSQL expertise tools via MCP (Model Context Protocol):

1. semantic_search_postgres_docs - Search official PostgreSQL documentation
2. semantic_search_tiger_docs - Search TimescaleDB and extension docs
3. view_skill - Access curated PostgreSQL best practices and patterns

**WHEN TO USE MCP TOOLS**:
- ALWAYS use MCP tools first when:
  - Designing new schemas (search for best practices)
  - Answering PostgreSQL questions (search docs)
  - Choosing data types or constraints (view skills)
  - Implementing indexes or performance optimizations

- You MAY skip MCP tools for:
  - Simple, direct requests ("add a column named X")
  - Listing existing tables
  - Minor modifications to existing schema

**WORKFLOW WITH MCP**:
1. For schema design tasks: First use view_skill or semantic_search to get best practices
2. Then use your atomic tools (createTable, addColumn, etc.) to implement
3. Apply the knowledge from MCP to create production-quality schemas
```

**Acceptance Criteria**:
- [ ] Agent prioritizes MCP tools for PostgreSQL knowledge
- [ ] Agent still uses atomic tools for schema manipulation
- [ ] Balance between MCP queries and direct execution

---

### 1.5 Add MCP Configuration to Project Config

**Task**: Update `.mcp.json` to include pg-aiguide server.

**File Modified**: `.mcp.json`

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    },
    "pg-aiguide": {
      "url": "https://mcp.tigerdata.com/docs"
    }
  }
}
```

**Acceptance Criteria**:
- [ ] MCP configuration valid JSON
- [ ] pg-aiguide server properly configured

---

## Phase II: Advanced MCP Integration & Intelligence

### Goal
Enhance the agent's decision-making for when to use MCP vs. direct execution, and add user controls.

### 2.1 Implement Smart MCP Tool Selection

**Task**: Create logic for intelligent tool selection based on request type.

**New File**: `src/lib/mcp-router.ts`

**Key Logic**:

```typescript
interface RequestAnalysis {
  requiresMCPKnowledge: boolean;
  suggestedMCPTools: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  category: 'design' | 'query' | 'modify' | 'question';
}

function analyzeRequest(userMessage: string): RequestAnalysis {
  // Keywords that suggest MCP knowledge is needed
  const knowledgeKeywords = [
    'best practice', 'recommend', 'should I', 'how to',
    'design', 'architecture', 'pattern', 'optimize',
    'index', 'performance', 'constraint', 'normalize'
  ];
  
  // Keywords for simple direct execution
  const simpleKeywords = [
    'add column', 'remove', 'rename', 'delete table',
    'drop', 'list tables', 'show'
  ];
  
  // Analyze and return recommendation
}
```

**Acceptance Criteria**:
- [ ] Accurate classification of requests
- [ ] Minimal false positives (unnecessary MCP calls)
- [ ] Handles edge cases gracefully

---

### 2.2 Add User MCP Control via Prompt

**Task**: Allow users to control MCP usage through special commands.

**Implementation**:

```typescript
// User can include these in their message:
// [use-mcp] - Force MCP tool usage
// [skip-mcp] - Skip MCP, use direct execution
// [mcp-verbose] - Show MCP queries in response

function parseUserMCPPreference(message: string): MCPPreference {
  if (message.includes('[use-mcp]')) return 'force';
  if (message.includes('[skip-mcp]')) return 'skip';
  if (message.includes('[mcp-verbose]')) return 'verbose';
  return 'auto'; // Default: agent decides
}
```

**Acceptance Criteria**:
- [ ] User commands properly parsed
- [ ] Commands removed from message before sending to LLM
- [ ] Preference respected in tool selection

---

### 2.3 MCP Response Caching

**Task**: Implement caching for MCP responses to reduce latency and API calls.

**New File**: `src/lib/mcp-cache.ts`

**Key Features**:
- In-memory cache with TTL (e.g., 5 minutes for docs, 1 hour for skills)
- Cache key based on query + version
- Cache invalidation on explicit request

**Acceptance Criteria**:
- [ ] Repeated queries served from cache
- [ ] Cache properly expires
- [ ] Memory usage bounded

---

### 2.4 MCP Error Handling & Fallback

**Task**: Implement robust error handling when MCP is unavailable.

**Implementation**:

```typescript
async function getToolsWithFallback(mcpClient: MCPClient | null) {
  const atomicTools = createAtomicTools();
  
  if (!mcpClient) {
    console.warn('[MCP] Client not available, using fallback');
    return atomicTools;
  }
  
  try {
    const mcpTools = await Promise.race([
      mcpClient.tools(),
      timeout(5000), // 5 second timeout
    ]);
    return { ...atomicTools, ...mcpTools };
  } catch (error) {
    console.error('[MCP] Failed to get tools:', error);
    return atomicTools; // Graceful fallback
  }
}
```

**Acceptance Criteria**:
- [ ] App works when MCP server is down
- [ ] Timeout prevents hanging requests
- [ ] Errors logged for debugging

---

### 2.5 MCP Usage Telemetry

**Task**: Track MCP tool usage for analytics and debugging.

**New File**: `src/lib/mcp-telemetry.ts`

**Tracked Metrics**:
- MCP tools called per request
- Response times
- Cache hit/miss rates
- Error frequencies

**Acceptance Criteria**:
- [ ] Telemetry non-blocking
- [ ] Data accessible for debugging
- [ ] Privacy-conscious (no user data logged)

---

### 2.6 UI Indicator for MCP Status

**Task**: Add visual indicator showing MCP connection status.

**Files Modified**:
- `src/components/ui/` (new component)
- Chat interface component

**Features**:
- Green dot: MCP connected
- Yellow dot: MCP reconnecting
- Red dot: MCP unavailable (fallback mode)
- Tooltip showing MCP server info

**Acceptance Criteria**:
- [ ] Status accurately reflects MCP state
- [ ] Non-intrusive UI
- [ ] Accessible (screen reader friendly)

---

## Phase III: Testing & Documentation

### 3.1 Unit Tests for MCP Module

**Task**: Create comprehensive tests for MCP integration.

**New Files**:
- `src/lib/__tests__/mcp-client.test.ts`
- `src/lib/__tests__/mcp-router.test.ts`

**Test Coverage**:
- MCP client connection/disconnection
- Tool merging logic
- Request analysis
- Error handling
- Cache behavior

---

### 3.2 Integration Tests

**Task**: Test end-to-end MCP flow.

**Test Scenarios**:
1. User asks for schema design → MCP tools used → Schema created
2. User asks simple question → Direct response (no MCP)
3. MCP server down → Fallback to atomic tools only
4. User forces MCP usage → MCP tools used regardless

---

### 3.3 Documentation

**Task**: Update project documentation.

**Files**:
- `README.md` - Add MCP section
- `docs/MCP_USAGE.md` - Detailed MCP usage guide
- API documentation updates

---

## Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase I (1.1-1.5) | 2-3 days | None |
| Phase II (2.1-2.6) | 3-4 days | Phase I complete |
| Phase III (3.1-3.3) | 2-3 days | Phase II complete |

**Total Estimated Time**: 7-10 days

---

## Quality Gates

### Before Merging Phase I
- [ ] All acceptance criteria for 1.1-1.5 met
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Manual testing: MCP tools appear in agent responses

### Before Merging Phase II
- [ ] All acceptance criteria for 2.1-2.6 met
- [ ] All Phase I quality gates still pass
- [ ] Manual testing: Smart routing works correctly
- [ ] Manual testing: Fallback works when MCP down

### Before Merging Phase III
- [ ] All tests pass
- [ ] Documentation reviewed
- [ ] No regressions in existing functionality

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| MCP server unavailable | Graceful fallback to atomic tools only |
| MCP response latency | Caching + timeout handling |
| Tool name conflicts | Namespace prefixing (mcp_*) |
| Breaking changes in AI SDK | Pin to specific version, test upgrades |
| Memory leaks from MCP client | Proper lifecycle management |

---

## Success Metrics

1. **Quality Improvement**: Schemas created with MCP should have:
   - More indexes (target: 50%+ more than without MCP)
   - More constraints
   - Modern PostgreSQL patterns

2. **Performance**: 
   - MCP queries < 2 seconds (cached < 100ms)
   - No noticeable latency increase for simple requests

3. **Reliability**:
   - 99%+ success rate with fallback
   - Zero app crashes due to MCP issues

---

## Appendix: MCP Tools Reference

### pg-aiguide Available Tools

1. **semantic_search_postgres_docs**
   - Searches official PostgreSQL manual
   - Version-aware (supports PG 12-17)
   - Returns relevant documentation sections

2. **semantic_search_tiger_docs**
   - Searches TimescaleDB documentation
   - Extension ecosystem docs
   - Coming soon: pgvector, PostGIS

3. **view_skill**
   - Returns curated best practices
   - Topics: schema design, indexing, data types, naming conventions
   - AI-optimized format

### Example MCP Usage Flow

```
User: "Design a schema for a SaaS multi-tenant application"

Agent Workflow:
1. view_skill("multi-tenant-patterns") → Learn best practices
2. semantic_search_postgres_docs("row level security") → Get RLS details
3. semantic_search_postgres_docs("schema isolation") → Get schema patterns
4. createTable("tenants", {...}) → Create with RLS policies
5. createTable("users", {...}) → With tenant_id FK
6. ... (apply learned patterns)
```

---

## Notes

- The AI SDK 6's MCP support is stable but continue monitoring for updates
- pg-aiguide is a public MCP server maintained by Timescale
- Consider self-hosting pg-aiguide for production (when available)
- MCP tools complement, not replace, the existing atomic tools