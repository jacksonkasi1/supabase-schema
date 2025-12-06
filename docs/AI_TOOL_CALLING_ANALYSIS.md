# AI Tool Calling Issues - Root Cause Analysis

## Executive Summary

The AI makes excessive tool calls and schema changes don't reflect in the UI due to **state synchronization issues** between the API route and the frontend, along with **inefficient tool usage patterns**.

---

## Key Problems Identified

### 1. **State Synchronization Gap** (Critical)

**Problem**: Schema modifications happen in an ephemeral server-side state that doesn't sync back to the client UI.

**Current Flow**:
```
User: "delete users table"
  ↓
AI calls listTables → Returns 8 tables from CLIENT state
  ↓
AI calls modifySchema(drop: users) → Modifies SERVER state only
  ↓
AI calls listTables again → Returns 8 tables from CLIENT state (unchanged!)
  ↓
AI confused: "I deleted it but it's still there" → Makes more tool calls
```

**Root Cause**:
- `src/app/api/chat/route.ts` line 204: Creates local `schemaState` clone
- Modifications apply ONLY to this temporary copy
- Returns updated tables in tool output, but...
- `src/components/ChatSidebar.tsx` line 118: The detection logic may not be working properly due to Vercel AI SDK message structure

**Evidence from Console Logs**:
```javascript
// Tool succeeds
{ type: "tool-modifySchema", output: { ok: true, tables: {...} } }

// But then AI sees unchanged tables
{ type: "tool-listTables", output: { total: 8, tables: [...] } }  // Still 8!

// Result: "[onFinish] No schema updates detected in this message"
```

---

### 2. **Excessive Tool Calls** (High Priority)

**Problem**: AI makes redundant calls because it doesn't trust or remember previous results.

**Example from User's Chat**:
```
User: "list tables"
AI: calls listTables() → shows 8 tables

User: "show"
AI: calls listTables() AGAIN → same 8 tables

User: "delete users table"
AI: calls listTables() with includeColumns → 8 tables
AI: calls modifySchema() → claims success
AI: calls listTables() AGAIN → STILL 8 tables!

User: "ok delete"
AI: "Could you please tell me which table you'd like me to delete?"
AI: calls listTables() AGAIN → NOW shows 8 tables
```

**Root Causes**:
1. **State desync** makes AI doubt its actions
2. **System prompt lacks emphasis on efficiency**
3. **No conversation memory optimization**
4. **Tools don't provide clear confirmation**

---

### 3. **Provider-Specific Tool Implementation** (Medium Priority)

**Problem**: Current implementation is already provider-agnostic (uses Vercel AI SDK), but the tool definitions could be more robust.

**Current State** (Good ✅):
```typescript
// src/app/api/chat/route.ts
const tools = {
  listTables: tool({
    description: '...',
    inputSchema: z.object({...}),
    execute: async (params) => {...}
  })
}
```

This works with both OpenAI and Google Gemini! But we need to:
- Improve tool descriptions
- Add better result types
- Optimize parameter schemas

---

## Detailed Technical Analysis

### State Management Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (Zustand Store)               │
│  src/lib/store.ts                       │
│  - tables: TableState                   │
│  - updateTablesFromAI(tables)           │
└────────────┬────────────────────────────┘
             │
             │ sends tables in request body
             ↓
┌─────────────────────────────────────────┐
│  API Route: /api/chat                   │
│  src/app/api/chat/route.ts              │
│                                         │
│  1. Clone client tables                 │
│     const schemaState = cloneTables()   │
│                                         │
│  2. AI calls tools                      │
│     tools operate on schemaState        │
│                                         │
│  3. Return tool outputs                 │
│     { ok: true, tables: schemaState }   │
└────────────┬────────────────────────────┘
             │
             │ streams response with tool outputs
             ↓
┌─────────────────────────────────────────┐
│  ChatSidebar.tsx                        │
│  onFinish callback                      │
│                                         │
│  ISSUE: May not detect tool outputs    │
│  if (part.type === 'tool-modifySchema') │
│    updateTablesFromAI(part.output.tables)│
└─────────────────────────────────────────┘
```

### Console Log Evidence

From user's actual console output:

```javascript
// Message structure returned by AI SDK
{
  "id": "kE0NSvPpzUwsXKC2",
  "role": "assistant",
  "parts": [
    { "type": "step-start" },
    { "type": "text", "text": "I am now deleting all of these tables." },
    {
      "type": "tool-modifySchema",
      "toolCallId": "Z3TPUG3tXJn1njvE",
      "state": "output-available",
      "input": { "operations": [...] },
      "output": {
        "ok": true,
        "tables": { /* updated tables */ },
        "operationsApplied": [...]
      }
    }
  ]
}

// But then: "[onFinish] No schema updates detected in this message"
// Meaning: The if condition at line 118 is NOT matching!
```

**Why detection fails:**
1. Type checking might be too strict
2. Output might be undefined initially (async timing)
3. Vercel AI SDK structure might differ from expected

---

## Recommended Solutions

### Solution 1: Fix State Synchronization (CRITICAL - Do This First)

**Fix the detection logic in ChatSidebar.tsx:**

```typescript
// Current (line 116-142)
message.parts.forEach((part: any) => {
  if (part.type === 'tool-modifySchema' && part.output) {
    console.log('[onFinish] Found modifySchema tool output:', part.output);
    // ...
  }
});

// PROBLEMS:
// 1. Vercel AI SDK might use different structure
// 2. Type check might be too specific
// 3. Need to handle different message part types

// BETTER APPROACH:
message.parts.forEach((part: any) => {
  // Check multiple possible structures
  const isModifyTool =
    part.type === 'tool-modifySchema' ||
    (part.type?.startsWith('tool-') && part.toolName === 'modifySchema');

  if (!isModifyTool) return;

  // Handle different output structures
  const output = part.output || part.result;

  if (output && typeof output === 'object' && 'tables' in output) {
    console.log('[onFinish] Applying schema update:', {
      tableCount: Object.keys(output.tables).length,
      operations: output.operationsApplied
    });

    updateTablesFromAI(output.tables);
    schemaUpdated = true;

    // Better user feedback
    toast.success('Schema updated successfully', {
      description: `${Object.keys(output.tables).length} tables in workspace`,
    });
  }
});
```

### Solution 2: Optimize Tool Calling (HIGH PRIORITY)

**Update System Prompt** in `src/app/api/chat/route.ts`:

```typescript
const SYSTEM_PROMPT = `You are a PostgreSQL schema assistant with FULL CONTEXT of all database operations.

**CRITICAL RULES:**
1. TRUST your tool results - if a tool succeeds, the operation IS completed
2. NEVER call the same tool twice in a row for the same information
3. Use listTables({includeColumns: true}) ONCE to get ALL info needed
4. After modifySchema succeeds, the changes are DONE - don't verify
5. ALWAYS respond in plain English - tool calls alone are insufficient

**Available Tools:**
- listTables: Get all tables (includeColumns:true shows FK relationships)
- getTableDetails: Get ONE specific table (avoid if listTables already called)
- modifySchema: Make schema changes (create/drop/alter tables)

**Optimal Conversation Patterns:**

❌ BAD (4 tool calls):
User: "delete users table"
→ listTables()
→ listTables({includeColumns: true})
→ modifySchema([...])
→ listTables()  // Unnecessary verification!

✅ GOOD (2 tool calls):
User: "delete users table"
→ listTables({includeColumns: true})  // Get FK dependencies
→ modifySchema([drop users, drop user_profiles, drop posts, ...])
Response: "Deleted users table and 4 related tables."

**FK Relationship Detection:**
Check column.fk property: { title: "user_id", fk: "users.id" }

**Response Format:**
Every response MUST explain your actions in conversational English.
Be confident - if modifySchema returns ok:true, the change succeeded!`;
```

### Solution 3: Improve Tool Responses

**Make tool outputs more informative:**

```typescript
// In modifySchema tool (line 506)
modifySchema: tool({
  description: 'Apply schema modifications. Returns updated full schema state.',
  inputSchema: modifySchemaParams,
  execute: async (input: ModifySchemaInput) => {
    const result = applySchemaOperations(input);

    // Add summary for AI to understand
    return {
      ...result,
      summary: {
        totalTables: Object.keys(schemaState).length,
        operationsCount: result.operationsApplied.length,
        successCount: result.operationsApplied.filter(op => op.status === 'success').length,
        message: result.ok
          ? `Successfully applied ${result.operationsApplied.length} operations. Database now has ${Object.keys(schemaState).length} tables.`
          : `Failed to apply operations. Check operationsApplied for details.`
      }
    };
  },
}),
```

### Solution 4: Add Better Debugging

**Enhanced logging for troubleshooting:**

```typescript
// In ChatSidebar.tsx onFinish
onFinish: ({ message }) => {
  console.log('[onFinish] Processing message:', {
    id: message.id,
    role: message.role,
    partCount: message.parts.length,
    partTypes: message.parts.map(p => p.type)
  });

  let toolsExecuted = 0;
  let schemaUpdated = false;

  message.parts.forEach((part: any, index: number) => {
    if (part.type?.startsWith('tool-')) {
      toolsExecuted++;

      console.log(`[onFinish] Tool ${toolsExecuted}:`, {
        type: part.type,
        hasOutput: !!part.output,
        outputKeys: part.output ? Object.keys(part.output) : [],
        state: part.state
      });

      // Detect modifySchema
      if (part.type === 'tool-modifySchema' && part.output?.tables) {
        const tableCount = Object.keys(part.output.tables).length;
        console.log(`[onFinish] 🎯 Applying schema update: ${tableCount} tables`);

        updateTablesFromAI(part.output.tables);
        schemaUpdated = true;

        toast.success(`Schema updated: ${tableCount} tables`, {
          description: `${part.output.operationsApplied?.length || 0} operations applied`
        });
      }
    }
  });

  console.log('[onFinish] Summary:', { toolsExecuted, schemaUpdated });
}
```

---

## Implementation Plan

### Phase 1: Critical Fixes (Do Immediately)

1. ✅ **Fix state sync detection in ChatSidebar.tsx**
   - Update `onFinish` handler to properly detect tool outputs
   - Add robust type checking for different message structures
   - Test with both OpenAI and Google Gemini

2. ✅ **Update system prompt to reduce redundant calls**
   - Emphasize trusting tool results
   - Add examples of efficient tool usage
   - Increase temperature slightly (already at 0.7, good)

3. ✅ **Add comprehensive logging**
   - Debug why detection is failing
   - Monitor tool call patterns
   - Track state updates

### Phase 2: Optimizations (Next)

4. ⬜ **Improve tool descriptions**
   - Add examples to tool descriptions
   - Clarify expected outputs
   - Document FK relationship detection

5. ⬜ **Add conversation memory**
   - Track what info AI already has
   - Prevent redundant listTables calls
   - Cache FK relationship map

6. ⬜ **Better error handling**
   - Clear error messages for failed operations
   - Rollback on failures
   - Validation before applying changes

### Phase 3: Advanced Features (Future)

7. ⬜ **Optimistic UI updates**
   - Show pending changes immediately
   - Rollback on failure
   - Visual diff of changes

8. ⬜ **Batch operations**
   - Group related operations
   - Single modifySchema call for cascading deletes
   - Undo/redo support

9. ⬜ **Schema versioning**
   - Track change history
   - Allow reverting changes
   - Show diff between versions

---

## Testing Checklist

After implementing fixes, test these scenarios:

- [ ] Create a new table
- [ ] Delete a table with FK relationships
- [ ] Rename a table
- [ ] Add/remove columns
- [ ] Modify column properties
- [ ] Multiple operations in one conversation
- [ ] Switch between OpenAI and Google Gemini
- [ ] Refresh page after changes
- [ ] Large schema (50+ tables)

---

## Code References

### Key Files to Modify:

1. **src/components/ChatSidebar.tsx** (Line 100-147)
   - Fix `onFinish` handler
   - Improve tool output detection
   - Add better logging

2. **src/app/api/chat/route.ts** (Line 125-153)
   - Update SYSTEM_PROMPT
   - Improve tool descriptions
   - Add result summaries

3. **src/lib/store.ts** (Line 282-314)
   - Already has `updateTablesFromAI` ✅
   - Consider adding state version tracking
   - Add change event emitters

---

## Performance Considerations

### Current Issues:
- Every message sends full table state (can be MB for large schemas)
- No request deduplication
- No caching of tool results

### Improvements:
1. **Delta updates**: Send only changed tables
2. **Compression**: Gzip table data
3. **Pagination**: Limit tables returned
4. **Caching**: Store FK relationships client-side

---

## Conclusion

The root cause is **state synchronization failure** between the API and frontend. The tool calls work correctly on the server, but:

1. UI doesn't update because `onFinish` detection fails
2. AI sees stale state on next message
3. AI makes redundant calls trying to figure out what happened
4. User sees no changes and gets frustrated

**Fix Priority**:
1. 🔴 CRITICAL: Fix ChatSidebar onFinish detection
2. 🟡 HIGH: Update system prompt to reduce redundancy
3. 🟢 MEDIUM: Improve tool descriptions and outputs

Implement Phase 1 immediately to resolve user's issue!
