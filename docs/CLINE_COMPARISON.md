# Cline vs Our Implementation - Critical Differences

## Cline's Pattern (Correct)

### 1. Context Freshness
```typescript
// BEFORE each API call
messages = await this.contextManager.getMessages()  // ✅ Fresh context
const tools = this.toolExecutor.getAvailableTools()  // ✅ Fresh tools

// THEN make API call
const response = await api.call(messages, tools)
```

### 2. Tool Result Integration
```typescript
// After tool execution
this.contextManager.addToolResult(toolUse.id, result)  // ✅ Immediately update context

// Next API call automatically gets updated context
```

### 3. State Capture
```typescript
// After state-changing operation
this.takeScreenshot()  // ✅ Explicit state capture
screenshots.push(screenshot)  // ✅ Add to context

// This ensures next decision has current state
```

## Our Pattern (Broken)

### 1. Context Stale in Transport
```typescript
// ❌ Created ONCE with initial state
const transport = useMemo(
  () => new DefaultChatTransport({
    body: { schema: tables }  // Captures tables at creation time
  }),
  [tables]  // Re-creates when tables changes, but...
)

// ❌ React re-render is async, user can send message before re-render
await sendMessage({ text: input })
```

**Problem**: Even with my fix moving schema to per-message body:
```typescript
await sendMessage(
  { text: input },
  { body: { schema: tables } }  // ❌ Still reading from closure!
)
```

The `onSubmit` function is created during render. If Zustand updates `tables` but React hasn't re-rendered yet, `tables` in the closure is STALE!

### 2. No Explicit Context Rebuilding

Cline does:
```typescript
// ✅ Fresh read before each call
const currentState = await this.stateManager.getCurrentState()
```

We do:
```typescript
// ❌ Reading from closure captured at render time
const { tables } = useStore()  // Captured at render
// ... later ...
sendMessage({ body: { schema: tables } })  // Uses captured value!
```

## The Real Root Cause

**Closure Capture Issue:**

1. Component renders with `tables = { table1, table2, ... table8 }`
2. `onSubmit` function is created, capturing current `tables` reference
3. AI deletes all tables → Zustand updates `tables = {}`
4. React schedules re-render (async!)
5. User quickly types and submits → calls OLD `onSubmit` with OLD `tables`
6. Message sent with 8 tables instead of 0

## The Correct Fix (Cline's Way)

Instead of reading from closure, read fresh state at send time:

```typescript
const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // ✅ Read FRESH state, not captured closure
  const currentTables = useStore.getState().tables

  await sendMessage(
    { text: input },
    {
      body: {
        schema: currentTables  // Fresh state!
      }
    }
  )
}
```

Or use Zustand's `getState()` API which always returns current state, not captured closure.

## Why My Previous Fix Might Not Work

My fix:
```typescript
await sendMessage({ body: { schema: tables } })
```

Problem: `tables` is from component props/hooks, captured at render time!

Cline's approach:
```typescript
const currentState = this.stateManager.getCurrentState()  // ✅ Always fresh
await api.call({ context: currentState })
```

## Action Items

1. ✅ Use `useStore.getState()` instead of hook value in onSubmit
2. ✅ Verify Zustand reference updates in updateTablesFromAI
3. ✅ Test with console logging to confirm fresh state
