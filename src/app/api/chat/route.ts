import {
  ToolLoopAgent,
  stepCountIs,
  tool,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import type {
  Column,
  Table,
  TableState,
  StreamingProgress,
  StreamingTablesBatch,
  StreamingNotification,
} from '@/lib/types';

// Type for our custom streaming data parts
type CustomDataPart =
  | { type: 'data-progress'; data: StreamingProgress; transient?: boolean }
  | { type: 'data-tables-batch'; data: StreamingTablesBatch; id?: string }
  | {
      type: 'data-notification';
      data: StreamingNotification;
      transient?: boolean;
    }
  | {
      type: 'data-operation-history';
      data: { operations: OperationRecord[]; canUndo: boolean };
    };

// Operation history for undo/redo support (Phase 5.2)
export interface OperationRecord {
  id: string;
  type:
    | 'createTable'
    | 'dropTable'
    | 'renameTable'
    | 'addColumn'
    | 'dropColumn'
    | 'alterColumn';
  tableId: string;
  before: Table | null;
  after: Table | null;
  timestamp: number;
  description: string;
}

export const runtime = 'nodejs';

const PROVIDERS = {
  openai,
  google,
} as const;

const cloneTables = (tables?: TableState): TableState => {
  if (!tables) return {};
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(tables);
  }
  return JSON.parse(JSON.stringify(tables)) as TableState;
};

const cloneTable = (table?: Table): Table | null => {
  if (!table) return null;
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(table);
  }
  return JSON.parse(JSON.stringify(table)) as Table;
};

const parseTableIdentifier = (tableId: string) => {
  const parts = tableId.split('.');
  if (parts.length > 1) {
    return {
      schema: parts.slice(0, -1).join('.'),
      name: parts[parts.length - 1],
    };
  }
  return { schema: undefined, name: tableId };
};

const columnInputSchema = z.object({
  title: z.string().min(1, 'Column title is required'),
  type: z.string().optional(),
  format: z.string().optional(),
  default: z.any().optional(),
  required: z.boolean().optional(),
  pk: z.boolean().optional(),
  fk: z.string().optional(),
  enumValues: z.array(z.string()).optional(),
  enumTypeName: z.string().optional(),
  comment: z.string().optional(),
});

// Atomic tool params - one operation at a time
const createTableParams = z.object({
  tableId: z
    .string()
    .min(1)
    .describe('The table identifier (e.g., "users" or "public.users")'),
  columns: z
    .array(columnInputSchema)
    .min(1)
    .describe('Array of column definitions'),
  isView: z
    .boolean()
    .optional()
    .describe('Whether this is a view instead of a table'),
});

const dropTableParams = z.object({
  tableId: z.string().min(1).describe('The table identifier to drop'),
});

const renameTableParams = z.object({
  fromTableId: z.string().min(1).describe('Current table identifier'),
  toTableId: z.string().min(1).describe('New table identifier'),
});

const addColumnParams = z.object({
  tableId: z.string().min(1).describe('The table to add column to'),
  column: columnInputSchema.describe('Column definition'),
});

const dropColumnParams = z.object({
  tableId: z.string().min(1).describe('The table containing the column'),
  columnName: z.string().min(1).describe('Name of column to drop'),
});

const alterColumnParams = z.object({
  tableId: z.string().min(1).describe('The table containing the column'),
  columnName: z.string().min(1).describe('Name of column to alter'),
  patch: z
    .object({
      title: z.string().optional(),
      type: z.string().optional(),
      format: z.string().optional(),
      default: z.any().optional(),
      required: z.boolean().optional(),
      pk: z.boolean().optional(),
      fk: z.string().optional(),
      enumValues: z.array(z.string()).optional(),
      enumTypeName: z.string().optional(),
      comment: z.string().optional(),
    })
    .describe('Properties to update'),
});

const listTablesParams = z.object({
  schema: z.string().optional(),
  search: z.string().optional(),
  includeColumns: z.boolean().optional(),
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().min(0).optional(),
});

const getTableParams = z.object({
  tableId: z.string().min(1),
});

const listSchemasParams = z.object({
  includeSystem: z.boolean().optional(),
});

const normaliseColumn = (col: z.infer<typeof columnInputSchema>): Column => {
  const type = col.format ?? col.type ?? 'text';
  const format = col.type ?? col.format ?? type;
  return {
    title: col.title,
    type,
    format,
    default: col.default,
    required: col.required ?? false,
    pk: col.pk ?? false,
    fk: col.fk,
    enumValues: col.enumValues,
    enumTypeName: col.enumTypeName,
    comment: col.comment,
  };
};

const SYSTEM_PROMPT = `You are a PostgreSQL schema assistant with FULL CONTEXT of all database operations.

**CRITICAL: WORK INCREMENTALLY - LIKE A PROFESSIONAL IDE**
You MUST process schema changes ONE TABLE AT A TIME. This prevents browser freezes and provides real-time feedback.

**MANDATORY INCREMENTAL WORKFLOW:**
1. For EACH table modification, make a SEPARATE tool call
2. After EACH tool call, the result is streamed to the user immediately
3. Continue calling tools until ALL changes are complete
4. NEVER try to batch multiple table creations in your response

**EXAMPLE - Creating a blog schema:**
User: "Create a blog with users, posts, and comments"

✅ CORRECT (3 separate tool calls):
Step 1: "I'll create the tables one by one. Starting with users..."
→ createTable({tableId: "users", columns: [...]})

Step 2: "Users table created. Now creating posts..."
→ createTable({tableId: "posts", columns: [...]})

Step 3: "Posts table created. Finally, comments..."
→ createTable({tableId: "comments", columns: [...]})

Step 4: "Done! Created 3 tables: users (4 columns), posts (5 columns), comments (4 columns)."

❌ WRONG: Trying to describe all tables in one giant response

**AVAILABLE ATOMIC TOOLS:**
- listTables: Get all tables. Use includeColumns:true for full details
- getTableDetails: Get specific table details
- listSchemas: List database schemas
- createTable: Create ONE table (call multiple times for multiple tables)
- dropTable: Drop ONE table
- renameTable: Rename ONE table
- addColumn: Add ONE column to a table
- dropColumn: Remove ONE column from a table
- alterColumn: Modify ONE column in a table

**FK RELATIONSHIP DETECTION:**
Column foreign keys are in the fk property: { title: "user_id", fk: "users.id" }
When deleting a table with dependents, drop dependent tables FIRST (one at a time).

**STEP-BY-STEP PROGRESS:**
- Always explain what you're doing at each step
- Announce before each tool call: "Creating X table..." or "Adding Y column..."
- After completion, summarize: "Created X with N columns"
- For bulk operations, show progress: "Table 1/5 complete..."

**OPTIMAL PATTERNS:**

For simple queries:
User: "list tables"
→ listTables()
Response: "You have 8 tables: users, posts, comments..."

For modifications:
User: "add email column to users"
→ addColumn({tableId: "users", column: {title: "email", type: "string", format: "varchar"}})
Response: "Added email column (varchar) to users table."

For bulk operations:
User: "add created_at and updated_at to all tables"
1. listTables({includeColumns: true}) - "Let me check your tables..."
2. For EACH table, call addColumn separately
3. Provide running summary: "Added timestamps to users (1/4)... posts (2/4)..."

**REMEMBER:**
- ONE table operation per tool call
- Stream results after each operation
- Be efficient but incremental
- Trust your tool results completely
- Always explain your actions clearly`;

// Generate unique operation ID
const generateOperationId = () =>
  `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export async function POST(req: Request) {
  // Create abort controller for cancellation support (Phase 5.1)
  const abortController = new AbortController();

  // Forward request abort signal to our controller
  req.signal.addEventListener('abort', () => {
    console.log('[api/chat] Request aborted by client');
    abortController.abort();
  });

  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return new Response('Request body is required.', { status: 400 });
    }

    // Extract messages from request (useChat sends messages array)
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return new Response('At least one message is required.', { status: 400 });
    }

    const providerKey = (
      body.provider as keyof typeof PROVIDERS | undefined
    )?.toLowerCase();
    const apiKey = body.apiKey as string | undefined;

    const modelName =
      (body.model as string | undefined) ||
      (providerKey === 'google' ? 'models/gemini-2.5-flash' : 'gpt-4o-mini');

    let model;

    if (providerKey === 'google') {
      const provider = apiKey ? createGoogleGenerativeAI({ apiKey }) : google;
      model = provider(modelName);
    } else {
      const provider = apiKey ? createOpenAI({ apiKey }) : openai;
      model = provider(modelName);
    }

    const message = 'API key invalid or AI provider not configured properly.';
    if (!model) return new Response(message, { status: 400 });

    // Get schema state from request body (client sends current state)
    const schemaState: TableState = cloneTables(body.schema) || {};

    // Track operations for progress reporting and undo/redo (Phase 5.2)
    let operationCount = 0;
    let totalOperations = 0;
    const operationHistory: OperationRecord[] = [];

    // Helper to record operation for undo/redo
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
        before: cloneTable(before ?? undefined),
        after: cloneTable(after ?? undefined),
        timestamp: Date.now(),
        description,
      };
      operationHistory.push(record);
      return record;
    };

    // Create atomic tools
    const createAtomicTools = () => ({
      listSchemas: tool({
        description:
          'List all schemas in the database. Returns schemas like public, auth, storage, etc.',
        inputSchema: listSchemasParams,
        execute: async ({ includeSystem = false }) => {
          // Check for cancellation
          if (abortController.signal.aborted) {
            return { ok: false, message: 'Operation cancelled' };
          }

          // Extract unique schemas from table keys
          const schemas = new Set<string>();
          Object.entries(schemaState).forEach(([key, table]) => {
            const schema = table.schema || key.split('.')[0] || 'public';
            schemas.add(schema);
          });
          // Always include 'public'
          schemas.add('public');

          return {
            schemas: Array.from(schemas).filter(
              (s) =>
                includeSystem ||
                !['pg_catalog', 'information_schema'].includes(s),
            ),
            total: schemas.size,
          };
        },
      }),

      listTables: tool({
        description:
          'List tables in the workspace. Use includeColumns:true for column details.',
        inputSchema: listTablesParams,
        execute: async ({
          schema,
          search,
          includeColumns = false,
          limit = 100,
          offset = 0,
        }) => {
          if (abortController.signal.aborted) {
            return { ok: false, message: 'Operation cancelled' };
          }

          const entries = Object.entries(schemaState);

          const filtered = entries.filter(([key, table]) => {
            const tableSchema =
              table.schema ||
              (key.includes('.') ? key.split('.')[0] : 'public');

            // Filter by schema
            if (schema && tableSchema !== schema) return false;

            // Filter by search term
            if (search) {
              const target = `${tableSchema}.${table.title}`.toLowerCase();
              if (!target.includes(search.toLowerCase())) return false;
            }

            return true;
          });

          const sliced = filtered.slice(offset, offset + limit);
          const result = {
            total: filtered.length,
            tables: sliced.map(([key, table]) => ({
              id: key,
              schema: table.schema || 'public',
              title: table.title,
              isView: table.is_view || false,
              columnCount: table.columns?.length || 0,
              columns: includeColumns ? table.columns : undefined,
            })),
          };

          // Update total operations estimate based on table count
          if (result.total > 0) {
            totalOperations = Math.max(totalOperations, result.total);
          }

          return result;
        },
      }),

      getTableDetails: tool({
        description:
          'Get detailed information about a specific table including all columns.',
        inputSchema: getTableParams,
        execute: async ({ tableId }) => {
          if (abortController.signal.aborted) {
            return { ok: false, message: 'Operation cancelled' };
          }

          const table = schemaState[tableId];
          if (!table) {
            return {
              ok: false,
              message: `Table '${tableId}' not found`,
            };
          }
          return {
            ok: true,
            table,
          };
        },
      }),

      createTable: tool({
        description:
          'Create a single table with columns. Call multiple times for multiple tables.',
        inputSchema: createTableParams,
        execute: async ({ tableId, columns, isView = false }) => {
          if (abortController.signal.aborted) {
            return { ok: false, message: 'Operation cancelled' };
          }

          operationCount++;
          const { schema } = parseTableIdentifier(tableId);
          const normalizedColumns = columns.map(normaliseColumn);
          const existing = schemaState[tableId];

          // Record before state
          const beforeState = cloneTable(existing ?? undefined);

          const table: Table = {
            title: parseTableIdentifier(tableId).name,
            schema: schema || 'public',
            is_view: isView,
            columns: normalizedColumns,
            position: existing?.position || {
              x: 100 + Object.keys(schemaState).length * 50,
              y: 100 + Object.keys(schemaState).length * 50,
            },
          };

          schemaState[tableId] = table;

          // Record operation for undo
          recordOperation(
            'createTable',
            tableId,
            beforeState,
            table,
            `Created ${isView ? 'view' : 'table'} '${tableId}' with ${normalizedColumns.length} columns`,
          );

          return {
            ok: true,
            message: `Created ${isView ? 'view' : 'table'} '${tableId}'`,
            table: {
              id: tableId,
              columnCount: normalizedColumns.length,
              columns: normalizedColumns.map((c: Column) => c.title),
            },
          };
        },
      }),

      dropTable: tool({
        description:
          'Drop a single table from the workspace. Check for dependencies first.',
        inputSchema: dropTableParams,
        execute: async ({ tableId }) => {
          if (abortController.signal.aborted) {
            return { ok: false, message: 'Operation cancelled' };
          }

          if (!schemaState[tableId]) {
            return {
              ok: false,
              message: `Table '${tableId}' not found`,
            };
          }

          operationCount++;
          const beforeState = cloneTable(schemaState[tableId]);

          delete schemaState[tableId];

          // Record operation for undo
          recordOperation(
            'dropTable',
            tableId,
            beforeState,
            null,
            `Dropped table '${tableId}'`,
          );

          return {
            ok: true,
            message: `Dropped table '${tableId}'`,
            remainingTables: Object.keys(schemaState).length,
          };
        },
      }),

      renameTable: tool({
        description: 'Rename a table. Updates the table identifier and title.',
        inputSchema: renameTableParams,
        execute: async ({ fromTableId, toTableId }) => {
          if (abortController.signal.aborted) {
            return { ok: false, message: 'Operation cancelled' };
          }

          const source = schemaState[fromTableId];
          if (!source) {
            return {
              ok: false,
              message: `Table '${fromTableId}' not found`,
            };
          }

          operationCount++;
          const beforeState = cloneTable(source);
          const { schema } = parseTableIdentifier(toTableId);

          const updated: Table = {
            ...source,
            schema: schema || source.schema || 'public',
            title: parseTableIdentifier(toTableId).name,
          };

          delete schemaState[fromTableId];
          schemaState[toTableId] = updated;

          // Record operation for undo
          recordOperation(
            'renameTable',
            toTableId,
            beforeState,
            updated,
            `Renamed table '${fromTableId}' to '${toTableId}'`,
          );

          return {
            ok: true,
            message: `Renamed '${fromTableId}' to '${toTableId}'`,
          };
        },
      }),

      addColumn: tool({
        description:
          'Add a single column to a table. Call multiple times for multiple columns.',
        inputSchema: addColumnParams,
        execute: async ({ tableId, column }) => {
          if (abortController.signal.aborted) {
            return { ok: false, message: 'Operation cancelled' };
          }

          const table = schemaState[tableId];
          if (!table) {
            return {
              ok: false,
              message: `Table '${tableId}' not found`,
            };
          }

          operationCount++;
          const beforeState = cloneTable(table);
          const normalizedColumn = normaliseColumn(column);
          const existingColumns = table.columns || [];

          // Check for duplicate column name
          if (existingColumns.some((c) => c.title === normalizedColumn.title)) {
            return {
              ok: false,
              message: `Column '${normalizedColumn.title}' already exists in '${tableId}'`,
            };
          }

          table.columns = [...existingColumns, normalizedColumn];

          // Record operation for undo
          recordOperation(
            'addColumn',
            tableId,
            beforeState,
            table,
            `Added column '${normalizedColumn.title}' to '${tableId}'`,
          );

          return {
            ok: true,
            message: `Added column '${normalizedColumn.title}' to '${tableId}'`,
            column: normalizedColumn.title,
            tableColumnCount: table.columns.length,
          };
        },
      }),

      dropColumn: tool({
        description: 'Remove a single column from a table.',
        inputSchema: dropColumnParams,
        execute: async ({ tableId, columnName }) => {
          if (abortController.signal.aborted) {
            return { ok: false, message: 'Operation cancelled' };
          }

          const table = schemaState[tableId];
          if (!table) {
            return {
              ok: false,
              message: `Table '${tableId}' not found`,
            };
          }

          operationCount++;
          const beforeState = cloneTable(table);
          const originalLength = table.columns?.length || 0;

          table.columns = (table.columns || []).filter(
            (c) => c.title !== columnName,
          );

          if (table.columns.length === originalLength) {
            return {
              ok: false,
              message: `Column '${columnName}' not found in '${tableId}'`,
            };
          }

          // Record operation for undo
          recordOperation(
            'dropColumn',
            tableId,
            beforeState,
            table,
            `Dropped column '${columnName}' from '${tableId}'`,
          );

          return {
            ok: true,
            message: `Dropped column '${columnName}' from '${tableId}'`,
            tableColumnCount: table.columns.length,
          };
        },
      }),

      alterColumn: tool({
        description: 'Modify properties of a single column.',
        inputSchema: alterColumnParams,
        execute: async ({ tableId, columnName, patch }) => {
          if (abortController.signal.aborted) {
            return { ok: false, message: 'Operation cancelled' };
          }

          const table = schemaState[tableId];
          if (!table) {
            return {
              ok: false,
              message: `Table '${tableId}' not found`,
            };
          }

          operationCount++;
          const beforeState = cloneTable(table);

          const columnIndex = (table.columns || []).findIndex(
            (c) => c.title === columnName,
          );

          if (columnIndex === -1) {
            return {
              ok: false,
              message: `Column '${columnName}' not found in '${tableId}'`,
            };
          }

          const originalColumn = table.columns![columnIndex];
          const updatedColumn: Column = {
            ...originalColumn,
            ...Object.fromEntries(
              Object.entries(patch).filter(([, v]) => v !== undefined),
            ),
          };

          // Handle type/format normalization
          if (patch.type || patch.format) {
            updatedColumn.type =
              patch.format ?? patch.type ?? originalColumn.type;
            updatedColumn.format =
              patch.type ?? patch.format ?? originalColumn.format;
          }

          table.columns![columnIndex] = updatedColumn;

          // Record operation for undo
          recordOperation(
            'alterColumn',
            tableId,
            beforeState,
            table,
            `Altered column '${columnName}' in '${tableId}'`,
          );

          const changedProps = Object.keys(patch).filter(
            (k) => (patch as Record<string, unknown>)[k] !== undefined,
          );

          return {
            ok: true,
            message: `Updated column '${columnName}' in '${tableId}'`,
            changes: changedProps,
          };
        },
      }),
    });

    // Create the ToolLoopAgent (AI SDK 6)
    const tools = createAtomicTools();
    const agent = new ToolLoopAgent({
      model,
      instructions: SYSTEM_PROMPT,
      tools,
      // Agent defaults to stepCountIs(20), increase for bulk operations
      stopWhen: stepCountIs(50),
      // Dynamic control based on step progress (Phase 4.3)
      prepareStep: async ({ stepNumber, steps }) => {
        // Log progress
        console.log(
          `[Agent Step ${stepNumber}] Previous steps: ${steps.length}, Operations: ${operationCount}`,
        );

        // After many steps, consider forcing completion
        if (stepNumber > 40) {
          console.log('[Agent] Approaching step limit, encouraging completion');
          return {
            toolChoice: 'auto' as const,
          };
        }

        // Default behavior
        return {};
      },
      onStepFinish: ({ toolCalls, toolResults, finishReason, text }) => {
        console.log(
          `[Step] Tool calls: ${toolCalls?.length || 0}, ` +
            `Results: ${toolResults?.length || 0}, ` +
            `Text: ${text ? text.substring(0, 50) : 'none'}, ` +
            `Finish: ${finishReason}`,
        );

        if (toolCalls) {
          toolCalls.forEach((call, i) => {
            console.log(`  Tool ${i + 1}: ${call.toolName}`);
          });
        }
      },
    });

    // Convert UIMessages to ModelMessages
    const modelMessages = await convertToModelMessages(messages);

    // Track last operation count for streaming updates
    let lastStreamedOperationCount = 0;

    // Create a custom UI message stream with streaming data parts support
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Send initial notification
        writer.write({
          type: 'data-notification',
          data: {
            message: 'Processing your request...',
            level: 'info',
          },
          transient: true,
        } as CustomDataPart);

        // Stream the agent response (agent.stream returns a Promise in AI SDK 6)
        const result = await agent.stream({
          messages: modelMessages,
          abortSignal: abortController.signal,
        });

        // Set up a periodic check for operation updates
        const intervalId = setInterval(() => {
          if (operationCount > lastStreamedOperationCount) {
            // Send progress update
            writer.write({
              type: 'data-progress',
              data: {
                message: `Processing operation ${operationCount}...`,
                current: operationCount,
                total: Math.max(totalOperations, operationCount),
                phase: 'processing',
              },
              transient: true,
            } as CustomDataPart);

            // Send updated tables state
            writer.write({
              type: 'data-tables-batch',
              id: `tables-update-${operationCount}`,
              data: {
                tables: cloneTables(schemaState),
                batchNumber: operationCount,
                isComplete: false,
              },
            } as CustomDataPart);

            lastStreamedOperationCount = operationCount;
          }
        }, 100);

        // Merge the agent's stream into our custom stream
        writer.merge(
          result.toUIMessageStream({
            sendSources: false,
            sendReasoning: false,
            onError: (error: unknown) => {
              console.error('[Agent error]', error);
              return error instanceof Error ? error.message : String(error);
            },
          }),
        );

        // Wait for the stream to complete
        try {
          await result.text; // text is a promise that resolves when streaming completes
        } catch (error: unknown) {
          if (abortController.signal.aborted) {
            console.log('[api/chat] Stream was cancelled');
          } else {
            throw error;
          }
        } finally {
          clearInterval(intervalId);
        }

        // Send any remaining updates
        if (operationCount > lastStreamedOperationCount) {
          writer.write({
            type: 'data-progress',
            data: {
              message: `Completed operation ${operationCount}`,
              current: operationCount,
              total: operationCount,
              phase: 'processing',
            },
            transient: true,
          } as CustomDataPart);

          writer.write({
            type: 'data-tables-batch',
            id: `tables-update-${operationCount}`,
            data: {
              tables: cloneTables(schemaState),
              batchNumber: operationCount,
              isComplete: false,
            },
          } as CustomDataPart);
        }

        // Send final state
        const tableCount = Object.keys(schemaState).length;

        if (operationCount > 0) {
          // Send final tables state
          writer.write({
            type: 'data-tables-batch',
            id: 'tables-final',
            data: {
              tables: cloneTables(schemaState),
              batchNumber: operationCount + 1,
              isComplete: true,
            },
          } as CustomDataPart);

          // Send completion notification
          writer.write({
            type: 'data-notification',
            data: {
              message: `Completed ${operationCount} operation${operationCount === 1 ? '' : 's'}. ${tableCount} table${tableCount === 1 ? '' : 's'} in workspace.`,
              level: 'success',
            },
            transient: true,
          } as CustomDataPart);

          // Send operation history for undo/redo support (Phase 5.2)
          if (operationHistory.length > 0) {
            writer.write({
              type: 'data-operation-history',
              data: {
                operations: operationHistory,
                canUndo: operationHistory.length > 0,
              },
            } as CustomDataPart);
          }
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error('[api/chat] unexpected error:', error);
    const message =
      error instanceof Error ? error.message : 'Unexpected server error';
    return new Response(message, { status: 500 });
  }
}
