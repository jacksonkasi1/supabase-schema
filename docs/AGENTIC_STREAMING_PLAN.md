# Agentic Streaming Chat Implementation Plan

## Problem Statement

When users ask the AI to modify schemas (e.g., "create a blog with users, posts, comments"), the AI tries to generate the entire schema in one shot, causing:
- Browser freezes due to large JSON payloads
- No real-time feedback during long operations
- Poor user experience compared to tools like Cursor IDE

## Solution Overview

Implement **Cursor-like agentic behavior** with:
1. **Atomic tools** - One operation per tool call (not batched)
2. **Incremental streaming** - Stream each change as it happens
3. **Multi-step agent loop** - AI decides when to continue or stop
4. **Real-time progress** - Show step-by-step updates in UI

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Request                              │
│              "Create a blog with users, posts, comments"         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI Agent (ToolLoopAgent)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Step 1     │→ │  Step 2     │→ │  Step 3     │→ ...        │
│  │ createTable │  │ createTable │  │ createTable │              │
│  │  (users)    │  │  (posts)    │  │ (comments)  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│   │ Stream   │    │ Stream   │    │ Stream   │                  │
│   │ Update 1 │    │ Update 2 │    │ Update 3 │                  │
│   └──────────┘    └──────────┘    └──────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend UI                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ "Creating users table..." → "Creating posts table..."   │    │
│  │ Progress: [████████░░] 2/3                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Schema Diagram (updates in real-time)                    │    │
│  │ ┌─────────┐    ┌─────────┐    ┌──────────┐              │    │
│  │ │ users   │───▶│ posts   │───▶│ comments │              │    │
│  │ └─────────┘    └─────────┘    └──────────┘              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Atomic Tools Refactoring ✅ COMPLETED

### Objective
Replace batch `modifySchema` tool with atomic operations.

### Changes Made

#### 1.1 New Atomic Tool Schemas
**File:** `src/app/api/chat/route.ts`

```typescript
// NEW: Atomic tool params - one operation at a time
const createTableParams = z.object({
  tableId: z.string().min(1),
  columns: z.array(columnInputSchema).min(1),
  isView: z.boolean().optional(),
});

const dropTableParams = z.object({
  tableId: z.string().min(1),
});

const renameTableParams = z.object({
  fromTableId: z.string().min(1),
  toTableId: z.string().min(1),
});

const addColumnParams = z.object({
  tableId: z.string().min(1),
  column: columnInputSchema,
});

const dropColumnParams = z.object({
  tableId: z.string().min(1),
  columnName: z.string().min(1),
});

const alterColumnParams = z.object({
  tableId: z.string().min(1),
  columnName: z.string().min(1),
  patch: z.object({ /* column properties */ }).partial(),
});
```

#### 1.2 Atomic Tool Implementations
Each tool:
- Performs ONE operation
- Streams the update immediately via `data-tables-batch`
- Returns a simple success/error response

```typescript
createTable: tool({
  description: 'Create a SINGLE table. For multiple tables, call this multiple times.',
  inputSchema: createTableParams,
  execute: async ({ tableId, columns, isView }) => {
    // Create single table
    schemaState[tableId] = table;
    
    // Stream update immediately
    streamTableUpdate(writer, 'Created table', tableId);
    
    return { ok: true, message: `Created table ${tableId}...` };
  },
}),
```

#### 1.3 Updated System Prompt
Instructs AI to work incrementally:

```
**CRITICAL: WORK INCREMENTALLY - LIKE A PROFESSIONAL IDE**
You MUST process schema changes ONE TABLE AT A TIME.

✅ CORRECT (3 separate tool calls):
Step 1: createTable({tableId: "users", ...})
Step 2: createTable({tableId: "posts", ...})
Step 3: createTable({tableId: "comments", ...})

❌ WRONG: Trying to describe all tables in one giant response
```

### Verification Checklist
- [x] All 6 atomic tools defined (createTable, dropTable, renameTable, addColumn, dropColumn, alterColumn)
- [x] Each tool streams updates via `data-tables-batch`
- [x] System prompt updated for incremental behavior
- [x] TypeScript compiles without errors
- [x] Old `modifySchema` tool removed

---

## Phase 2: Frontend Streaming Handler ✅ COMPLETED

### Objective
Update ChatSidebar to handle atomic tool streaming.

### Changes Made

#### 2.1 Updated `onFinish` Handler
**File:** `src/components/ChatSidebar.tsx`

```typescript
// Atomic schema-modifying tools
const schemaTools = [
  'createTable',
  'dropTable', 
  'renameTable',
  'addColumn',
  'dropColumn',
  'alterColumn',
];

// Note: Schema updates now handled by onData (streaming data-tables-batch)
// onFinish just logs completion
```

#### 2.2 Streaming Data Handler (Already Working)
The `handleStreamingData` callback already handles:
- `data-progress` - Updates progress indicator
- `data-tables-batch` - Applies table changes incrementally
- `data-notification` - Shows toasts

### Verification Checklist
- [x] `onFinish` updated to recognize atomic tools
- [x] Streaming handler applies updates in real-time
- [x] No duplicate toast notifications
- [x] Progress indicator shows step count

---

## Phase 3: Enhanced Progress UI ✅ COMPLETED

### Objective
Improve visual feedback during multi-step operations.

### Changes Made

#### 3.1 Progress Component Enhancement
**File:** `src/components/ChatSidebar.tsx`

Added enhanced progress indicator with:
- Animated progress bar showing step completion
- Step counter (e.g., "Step 2 of 5")
- Phase indicator badge (fetching/processing/applying)
- Smooth transition animations

```typescript
// Enhanced progress indicator (implemented)
{isLoading && (
  <div className="flex flex-col gap-2 px-3 py-2.5 bg-muted/50 rounded-xl border border-border/50">
    <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-sm font-medium">
        {streamingProgress?.message || 'Generating response...'}
      </span>
    </div>
    {streamingProgress && streamingProgress.total > 1 && (
      <>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(streamingProgress.current / streamingProgress.total) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {streamingProgress.current} of {streamingProgress.total}</span>
          {streamingProgress.phase && (
            <span className="capitalize px-1.5 py-0.5 bg-muted rounded text-[10px]">
              {streamingProgress.phase}
            </span>
          )}
        </div>
      </>
    )}
  </div>
)}
```

#### 3.2 Collapsible Tool Results (ToolResult Component)
Added a new reusable `ToolResult` component with:
- Collapsible details for list operations
- Tool-specific icons and color coding
- Expandable view showing detailed results
- Smooth animations

```typescript
function ToolResult({ tool }: { tool: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // ... icon selection, summary display, expandable details
}
```

#### 3.3 Tool-Specific Icons
- `createTable` → Table2 icon (emerald)
- `dropTable` → CircleMinus icon (red)
- `renameTable` → ArrowRightLeft icon (blue)
- `addColumn` → Columns icon (emerald)
- `dropColumn` → CircleMinus icon (orange)
- `alterColumn` → Edit3 icon (amber)
- `listTables` → Search icon (blue)
- `listSchemas` → List icon (purple)

#### 3.4 Beautiful Welcome Screen
Inspired by assistant-ui patterns:
- Gradient background with Wand2 icon
- Friendly "Hello there!" greeting
- Current tables display with badges
- Interactive suggestion buttons

```typescript
const SUGGESTIONS = [
  {
    title: 'Create a blog schema',
    prompt: 'Create a blog with users, posts, and comments tables',
    icon: Database,
  },
  {
    title: 'Add timestamps',
    prompt: 'Add created_at and updated_at columns to all tables',
    icon: Zap,
  },
  {
    title: 'List all tables',
    prompt: 'Show me all the tables in my schema',
    icon: List,
  },
];
```

#### 3.5 Header Styling Improvements
- Gradient background
- Sparkles icon in rounded container
- Message count badge

### New Icons Added
- `CheckCircle2` - Success indicator
- `Loader2` - Loading spinner
- `ChevronDown` / `ChevronUp` - Expandable sections
- `Table2` - Table operations
- `Columns` - Column operations
- `Edit3` - Alter operations
- `CircleMinus` - Drop operations
- `ArrowRightLeft` - Rename operations
- `Sparkles` - Header branding
- `Wand2` - Welcome screen
- `Database` - Schema suggestion
- `Zap` - Quick action suggestion
- `Search` - List tables
- `List` - List schemas

### Verification Checklist
- [x] Progress bar shows during multi-step operations
- [x] Each completed step shows a checkmark
- [x] Tool-specific icons for different operations
- [x] Color-coded status indicators (success/failure/running)
- [x] Contextual summaries for tool results
- [x] Collapsible tool details with expanded view
- [x] Beautiful welcome screen with suggestions
- [x] TypeScript compiles without errors
- [x] Build passes successfully

---

## Phase 4: AI SDK 6 Upgrade ✅ COMPLETED

### Objective
Upgrade to AI SDK 6.x for better agentic capabilities.

### Benefits
- `ToolLoopAgent` class for cleaner agent implementation
- Better `stopWhen` conditions
- Improved streaming primitives
- `prepareStep` callback for step-level control

### Migration Steps

#### 4.1 Package Update
```bash
bun add ai@^6.0.0 @ai-sdk/openai@latest @ai-sdk/google@latest @ai-sdk/react@latest
```

#### 4.2 Use ToolLoopAgent
```typescript
import { ToolLoopAgent, stepCountIs } from 'ai';

const schemaAgent = new ToolLoopAgent({
  model,
  instructions: SYSTEM_PROMPT,
  tools: {
    listTables,
    createTable,
    dropTable,
    addColumn,
    // ... other atomic tools
  },
  stopWhen: stepCountIs(50),
  onStepFinish: ({ toolCalls, toolResults }) => {
    // Stream updates after each step
  },
});

// In route handler
const stream = schemaAgent.stream({ messages });
```

#### 4.3 Use `prepareStep` for Dynamic Control
```typescript
prepareStep: async ({ stepNumber, steps }) => {
  // Adjust behavior based on progress
  if (stepNumber > 30) {
    return { 
      toolChoice: 'none' // Force completion after many steps
    };
  }
  return {};
},
```

### Verification Checklist
- [x] AI SDK 6 installed (ai@6.0.3, @ai-sdk/openai@3.0.1, @ai-sdk/google@3.0.1, @ai-sdk/react@3.0.3)
- [x] ToolLoopAgent implemented with instructions, tools, stopWhen, prepareStep, onStepFinish
- [x] All tools working with new API
- [x] Streaming working correctly via createUIMessageStream
- [x] Build passes
- [ ] E2E tests pass

---

## Phase 5: Advanced Features ✅ COMPLETED (5.1, 5.2 implemented; 5.3 designed)

### 5.1 Cancellation Support ✅ IMPLEMENTED
Allow users to cancel mid-operation:

**Backend (`src/app/api/chat/route.ts`):**
```typescript
// Create abort controller for cancellation support
const abortController = new AbortController();

// Forward request abort signal to our controller
req.signal.addEventListener('abort', () => {
  console.log('[api/chat] Request aborted by client');
  abortController.abort();
});

// Pass to agent.stream()
const result = await agent.stream({
  messages: modelMessages,
  abortSignal: abortController.signal,
});

// Each tool checks for cancellation
if (abortController.signal.aborted) {
  return { ok: false, message: 'Operation cancelled' };
}
```

**Frontend (`src/components/ChatSidebar.tsx`):**
```typescript
// Use stop function from useChat hook
const { messages, sendMessage, status, setMessages, stop } = useChat({...});

// Cancel handler
const handleCancel = useCallback(() => {
  stop();
  setStreamingProgress(null);
  toast.info('Operation cancelled');
}, [stop]);

// UI cancel button with StopCircle icon
<Button variant="ghost" size="sm" onClick={handleCancel}>
  <StopCircle className="h-3.5 w-3.5 mr-1" />
  Cancel
</Button>
```

### 5.2 Undo/Redo Operations ✅ IMPLEMENTED (History Tracking)
Track operations for undo capability:

**Type Definition (`src/lib/types.ts`):**
```typescript
export interface OperationRecord {
  id: string;
  type: 'createTable' | 'dropTable' | 'renameTable' | 'addColumn' | 'dropColumn' | 'alterColumn';
  tableId: string;
  before: Table | null;
  after: Table | null;
  timestamp: number;
  description: string;
}

export interface StreamingOperationHistory {
  operations: OperationRecord[];
  canUndo: boolean;
}
```

**Backend Recording (`src/app/api/chat/route.ts`):**
```typescript
const operationHistory: OperationRecord[] = [];

const recordOperation = (
  type: OperationRecord['type'],
  tableId: string,
  before: Table | null,
  after: Table | null,
  description: string,
): OperationRecord => {
  const record: OperationRecord = {
    id: generateOperationId(),
    type,
    tableId,
    before: cloneTable(before),
    after: cloneTable(after),
    timestamp: Date.now(),
    description,
  };
  operationHistory.push(record);
  return record;
};

// Each tool records its operation
recordOperation('createTable', tableId, beforeState, table, `Created table '${tableId}'`);
```

**Frontend Handler (`src/components/ChatSidebar.tsx`):**
```typescript
case 'data-operation-history': {
  const historyData = dataPart.data as StreamingOperationHistory;
  console.log('[onData] Operation history:', historyData.operations.length, 'operations');
  // TODO: Store in state for future undo/redo UI implementation
  break;
}
```

### 5.3 Parallel Operations 📋 DESIGNED (Future Implementation)
For independent operations, allow parallel execution:

```typescript
// AI can indicate operations are independent
{
  parallel: true,
  operations: [
    { tool: 'addColumn', args: { tableId: 'users', ... } },
    { tool: 'addColumn', args: { tableId: 'posts', ... } },
  ]
}
```

**Note:** The current architecture supports parallel execution at the AI SDK level. The `ToolLoopAgent` already handles tool calls efficiently. Future enhancement could add explicit parallel operation batching with UI feedback.

---

## Testing Plan

### Unit Tests
```typescript
// Test atomic tools
describe('createTable', () => {
  it('creates a single table', async () => {
    const result = await tools.createTable.execute({
      tableId: 'users',
      columns: [{ title: 'id', type: 'integer', pk: true }],
    });
    expect(result.ok).toBe(true);
    expect(schemaState['users']).toBeDefined();
  });

  it('streams update after creation', async () => {
    // Verify data-tables-batch is sent
  });
});
```

### Integration Tests
```typescript
describe('Multi-step schema creation', () => {
  it('creates multiple tables incrementally', async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Create users and posts tables' }],
      }),
    });
    
    // Verify streaming updates
    const reader = response.body.getReader();
    let stepCount = 0;
    // ... read stream and count steps
    
    expect(stepCount).toBe(2); // One step per table
  });
});
```

### E2E Tests
```typescript
test('User can create blog schema incrementally', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="chat-input"]', 'Create a blog with users and posts');
  await page.click('[data-testid="send-button"]');
  
  // Verify progress updates
  await expect(page.locator('[data-testid="progress-message"]'))
    .toContainText('Creating users table');
  
  await expect(page.locator('[data-testid="progress-message"]'))
    .toContainText('Creating posts table');
  
  // Verify final schema
  await expect(page.locator('[data-testid="table-node"]')).toHaveCount(2);
});
```

---

## Rollback Plan

If issues arise, rollback by:

1. Revert to batch `modifySchema` tool
2. Keep streaming infrastructure (it's additive)
3. Update system prompt to allow batching

```bash
git revert HEAD~N  # Revert N commits
```

---

## Success Metrics

| Metric | Before | Target | 
|--------|--------|--------|
| Time to first visual feedback | 5-10s | <1s |
| Browser freeze incidents | Common | Zero |
| User cancellation rate | High | Low |
| Schema creation success rate | ~80% | >95% |

---

## References

- [AI SDK 6 Documentation](https://ai-sdk.dev/docs)
- [ToolLoopAgent Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent)
- [Streaming Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data#stream-structured-outputs)
- [Tool Calling Guide](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [assistant-ui ToolFallback Pattern](https://www.assistant-ui.com/docs/ui/ToolFallback)

---

## Changelog

| Date | Phase | Status | Notes |
|------|-------|--------|-------|
| 2024-XX-XX | Phase 1 | ✅ Complete | Atomic tools implemented |
| 2024-XX-XX | Phase 2 | ✅ Complete | Frontend handler updated |
| 2024-XX-XX | Phase 3 | ✅ Complete | Enhanced progress UI with progress bar, collapsible tool results, beautiful welcome screen, and assistant-ui inspired design patterns |
| 2024-12-23 | Phase 4 | ✅ Complete | AI SDK 6.0.3 upgrade with ToolLoopAgent, prepareStep, createUIMessageStream |
| 2024-12-23 | Phase 5 | ✅ Complete | Cancellation support (5.1), Operation history tracking (5.2), Parallel ops designed (5.3) |

---

## Implementation Summary

### Files Changed
1. **`src/app/api/chat/route.ts`**
   - Added 6 atomic tool schemas
   - Implemented atomic tool handlers with streaming
   - Updated system prompt for incremental behavior
   - **Phase 4:** Refactored to use `ToolLoopAgent` from AI SDK 6
   - **Phase 4:** Added `prepareStep` callback for dynamic control
   - **Phase 5.1:** Added abort controller and cancellation support
   - **Phase 5.2:** Added `OperationRecord` type and `recordOperation()` helper
   - **Phase 5.2:** Streams operation history via `data-operation-history` data part

2. **`src/components/ChatSidebar.tsx`**
   - Added `ToolResult` component with collapsible details
   - Enhanced progress bar with step counter and phase indicator
   - Beautiful welcome screen with suggestions
   - Improved header styling with gradient and icons
   - Added tool-specific icons and color coding
   - **Phase 5.1:** Added `stop` function from `useChat` hook
   - **Phase 5.1:** Added Cancel button with `StopCircle` icon during loading
   - **Phase 5.2:** Added handler for `data-operation-history` streaming data
   - **UI Enhancement:** Added `MarkdownText` component for rich text rendering
   - **UI Enhancement:** Assistant-ui style message layout with avatars (Bot/User icons)
   - **UI Enhancement:** Improved action bar with tooltips (Copy, External Link, Delete)
   - **UI Enhancement:** `CopyButton` component with feedback state
   - **UI Enhancement:** Enhanced welcome screen with descriptions for suggestions

3. **`src/lib/types.ts`**
   - Streaming data types already in place
   - **Phase 5.2:** Added `OperationRecord` interface
   - **Phase 5.2:** Added `StreamingOperationHistory` interface
   - **Phase 5.2:** Added `data-operation-history` to `StreamingDataPart` union

4. **`package.json`**
   - **Phase 4:** Updated AI SDK packages to v6:
     - `ai@6.0.3`
     - `@ai-sdk/openai@3.0.1`
     - `@ai-sdk/google@3.0.1`
     - `@ai-sdk/react@3.0.3`
   - **UI Enhancement:** Added markdown packages:
     - `react-markdown@10.1.0`
     - `remark-gfm@4.0.1`

5. **`src/components/ui/markdown-text.tsx`** (NEW)
   - Custom MarkdownText component following assistant-ui patterns
   - Supports GFM (GitHub Flavored Markdown) with `remark-gfm`
   - Custom styled components: headings, paragraphs, lists, code blocks, links, tables, blockquotes
   - Inline code with `bg-muted` styling and primary color
   - Code blocks with proper font-mono and overflow handling
   - Links open in new tab with underline styling

### Design Patterns Used (Inspired by assistant-ui)
- **Collapsible Tool Results**: Similar to assistant-ui's ToolFallback component
- **Progress Indicators**: Animated spinners and progress bars
- **Welcome Screen**: Greeting with suggestions (like assistant-ui's ThreadWelcome)
- **Tool Icons**: Visual feedback for different operation types
- **Color Coding**: Success (emerald), Error (red), Running (primary), Warning (orange)
- **Message Layout**: Avatar-based layout with Bot/User icons (assistant-ui style)
- **Markdown Rendering**: Full markdown support with GFM extensions
- **Action Bar**: Hover-to-reveal action buttons with tooltips
- **Copy Feedback**: Check icon feedback after copy action
- **Gradient Avatars**: Assistant has emerald-to-teal gradient avatar