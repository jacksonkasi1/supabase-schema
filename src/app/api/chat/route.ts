import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import type { Column, Table, TableState } from '@/lib/types';

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

const modifySchemaParams = z.object({
  operations: z
    .array(
      z.discriminatedUnion('action', [
        z.object({
          action: z.literal('create_table'),
          tableId: z.string().min(1),
          columns: z.array(columnInputSchema).min(1),
          isView: z.boolean().optional(),
        }),
        z.object({
          action: z.literal('drop_table'),
          tableId: z.string().min(1),
        }),
        z.object({
          action: z.literal('rename_table'),
          fromTableId: z.string().min(1),
          toTableId: z.string().min(1),
        }),
        z.object({
          action: z.literal('add_column'),
          tableId: z.string().min(1),
          column: columnInputSchema,
        }),
        z.object({
          action: z.literal('drop_column'),
          tableId: z.string().min(1),
          columnName: z.string().min(1),
        }),
        z.object({
          action: z.literal('alter_column'),
          tableId: z.string().min(1),
          columnName: z.string().min(1),
          patch: columnInputSchema
            .extend({
              title: z.string().optional(),
            })
            .partial(),
        }),
      ])
    )
    .min(1),
});

type ModifySchemaInput = z.infer<typeof modifySchemaParams>;

const normaliseColumn = (input: z.infer<typeof columnInputSchema>): Column => {
  const type = input.type ?? input.format ?? 'string';
  const format = input.format ?? type;
  return {
    title: input.title,
    type,
    format,
    default: input.default,
    required: input.required ?? false,
    pk: input.pk ?? false,
    fk: input.fk,
    enumValues: input.enumValues,
    enumTypeName: input.enumTypeName,
    comment: input.comment,
  };
};

const SYSTEM_PROMPT = `You are a PostgreSQL schema assistant with FULL CONTEXT of all database operations.

**CRITICAL RULES:**
1. ALWAYS provide a brief text response WITH EVERY tool call explaining what you're doing
2. You can make MULTIPLE tool calls autonomously (up to 20 steps) to complete complex tasks
3. After EACH tool result, IMMEDIATELY decide: call another tool OR provide final response
4. NEVER leave the user waiting without a response - always explain your actions
5. TRUST your tool results completely - if a tool returns data, it IS the current truth

**AUTONOMOUS MULTI-STEP PATTERN (like Cline):**
Example: "add created_at and updated_at to all tables"

Step 1: Call listTables({includeColumns: true}) + "Let me check all your tables first."
Step 2: Analyze results, call modifySchema + "Adding the columns to 8 tables now."
Step 3: Final response: "Done! Added created_at and updated_at to all 8 tables."

**MANDATORY RESPONSE FORMAT:**
- ALWAYS include text explaining what you're doing, even when calling tools
- NEVER return tool calls without accompanying text
- Be brief but clear - the user must understand what's happening at each step
- Continue calling tools autonomously until the task is 100% complete

**Available Tools:**
- listTables: Get all tables. Use includeColumns:true ONCE to see all column details and FK relationships
- getTableDetails: Get specific table details (AVOID if you already called listTables with includeColumns)
- listSchemas: List database schemas
- modifySchema: Apply schema changes (create/drop/alter tables/columns). Returns updated state with ok:true on success.

**FK Relationship Detection:**
Column foreign keys are in the fk property: { title: "user_id", fk: "users.id" }
When deleting a table, you must delete all tables that reference it via FK.

**OPTIMAL CONVERSATION PATTERNS:**

❌ BAD (inefficient - 4 tool calls):
User: "delete users table"
→ listTables()                           // Gets basic info
→ listTables({includeColumns: true})     // Gets detailed info (redundant!)
→ modifySchema([...])                     // Makes changes
→ listTables()                            // Verifies (unnecessary!)
Response: "Deleted."

✅ GOOD (efficient - 2 tool calls):
User: "delete users table"
→ listTables({includeColumns: true})     // Get everything needed in ONE call
→ modifySchema([                          // Make all changes at once
    {action: "drop_table", tableId: "user_profiles"},
    {action: "drop_table", tableId: "posts"},
    {action: "drop_table", tableId: "comments"},
    {action: "drop_table", tableId: "reactions"},
    {action: "drop_table", tableId: "users"}
  ])
Response: "I've deleted the users table and 4 related tables (user_profiles, posts, comments, reactions) that had foreign keys to it. Your database now has 3 tables remaining."

**More Examples:**

User: "list tables"
→ listTables()
Response: "You have 8 tables: users, posts, comments, categories, post_categories, reactions, user_profiles, and post_stats."

User: "show me the users table"
→ listTables({includeColumns: true})  // Get all tables with columns (efficient for future queries)
Response: "The users table has 9 columns: id (integer, primary key), email (varchar), username (varchar), password_hash (text), role (enum: admin/author/reader), is_active (boolean), last_login (timestamptz), created_at (timestamptz), and updated_at (timestamptz)."

User: "add a phone column to users"
→ modifySchema([{action: "add_column", tableId: "users", column: {title: "phone", type: "string", format: "varchar", required: false}}])
Response: "Added a phone column (varchar, optional) to the users table."

**REMEMBER:**
- Be efficient: minimize tool calls by getting all info in one call
- Be confident: trust tool results and don't verify unnecessarily
- Be clear: always explain what you did in plain English
- Be accurate: when reporting counts, use the actual numbers from tool results`;


export async function POST(req: Request) {
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

    const providerKey: keyof typeof PROVIDERS =
      body.provider === 'google' || body.provider === 'openai'
        ? body.provider
        : 'openai';
    const apiKey =
      typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

    const modelName =
      typeof body.model === 'string' && body.model.trim().length > 0
        ? body.model.trim()
        : providerKey === 'google'
        ? 'gemini-1.5-pro-latest'
        : 'gpt-4o-mini';

    let model;
    try {
      if (providerKey === 'openai') {
        const provider =
          apiKey.length > 0 ? createOpenAI({ apiKey }) : openai;
        model = provider(modelName);
      } else {
        const provider =
          apiKey.length > 0
            ? createGoogleGenerativeAI({ apiKey })
            : google;
        model = provider(modelName);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize model';
      return new Response(message, { status: 400 });
    }

    const schemaState = cloneTables(body.schema);
    console.log(`[API] 📥 Received schema with ${Object.keys(schemaState).length} tables`);

    const applySchemaOperations = (input: ModifySchemaInput) => {
      let ok = true;
      const operationsApplied: Array<{
        action: string;
        tableId?: string;
        detail?: string;
        status: 'success' | 'error';
      }> = [];

      for (const operation of input.operations) {
        switch (operation.action) {
          case 'create_table': {
            const { schema } = parseTableIdentifier(operation.tableId);
            const columns = operation.columns.map(normaliseColumn);
            const existing = schemaState[operation.tableId];

            const table: Table = {
              title: operation.tableId,
              schema,
              is_view: operation.isView ?? false,
              columns,
              position: existing?.position ?? { x: 0, y: 0 },
            };

            schemaState[operation.tableId] = table;
            operationsApplied.push({
              action: operation.action,
              tableId: operation.tableId,
              detail: `Created ${operation.tableId} with ${columns.length} column${
                columns.length === 1 ? '' : 's'
              }.`,
              status: 'success',
            });
            break;
          }
          case 'drop_table': {
            if (schemaState[operation.tableId]) {
              delete schemaState[operation.tableId];
              operationsApplied.push({
                action: operation.action,
                tableId: operation.tableId,
                detail: `Removed ${operation.tableId}.`,
                status: 'success',
              });
            } else {
              ok = false;
              operationsApplied.push({
                action: operation.action,
                tableId: operation.tableId,
                detail: `Table ${operation.tableId} not found.`,
                status: 'error',
              });
            }
            break;
          }
          case 'rename_table': {
            const source = schemaState[operation.fromTableId];
            if (!source) {
              ok = false;
              operationsApplied.push({
                action: operation.action,
                tableId: operation.fromTableId,
                detail: `Table ${operation.fromTableId} not found.`,
                status: 'error',
              });
              break;
            }

            const { schema } = parseTableIdentifier(operation.toTableId);
            const updated: Table = {
              ...source,
              title: operation.toTableId,
              schema,
            };

            delete schemaState[operation.fromTableId];
            schemaState[operation.toTableId] = updated;
            operationsApplied.push({
              action: operation.action,
              tableId: operation.toTableId,
              detail: `Renamed ${operation.fromTableId} to ${operation.toTableId}.`,
              status: 'success',
            });
            break;
          }
          case 'add_column': {
            const table = schemaState[operation.tableId];
            if (!table) {
              ok = false;
              operationsApplied.push({
                action: operation.action,
                tableId: operation.tableId,
                detail: `Table ${operation.tableId} not found.`,
                status: 'error',
              });
              break;
            }

            const column = normaliseColumn(operation.column);
            const existingColumns = table.columns ?? [];
            table.columns = [...existingColumns, column];
            operationsApplied.push({
              action: operation.action,
              tableId: operation.tableId,
              detail: `Added column ${column.title}.`,
              status: 'success',
            });
            break;
          }
          case 'drop_column': {
            const table = schemaState[operation.tableId];
            if (!table || !table.columns) {
              ok = false;
              operationsApplied.push({
                action: operation.action,
                tableId: operation.tableId,
                detail: `Column ${operation.columnName} not found.`,
                status: 'error',
              });
              break;
            }

            const nextColumns = table.columns.filter(
              (column) => column.title !== operation.columnName
            );

            if (nextColumns.length === table.columns.length) {
              ok = false;
              operationsApplied.push({
                action: operation.action,
                tableId: operation.tableId,
                detail: `Column ${operation.columnName} not found.`,
                status: 'error',
              });
              break;
            }

            table.columns = nextColumns;
            operationsApplied.push({
              action: operation.action,
              tableId: operation.tableId,
              detail: `Removed column ${operation.columnName}.`,
              status: 'success',
            });
            break;
          }
          case 'alter_column': {
            const table = schemaState[operation.tableId];
            if (!table || !table.columns) {
              ok = false;
              operationsApplied.push({
                action: operation.action,
                tableId: operation.tableId,
                detail: `Table ${operation.tableId} not found.`,
                status: 'error',
              });
              break;
            }

            const columnIndex = table.columns.findIndex(
              (column) => column.title === operation.columnName
            );

            if (columnIndex === -1) {
              ok = false;
              operationsApplied.push({
                action: operation.action,
                tableId: operation.tableId,
                detail: `Column ${operation.columnName} not found.`,
                status: 'error',
              });
              break;
            }

            const originalColumn = table.columns[columnIndex];
            const updatedColumn: Column = {
              ...originalColumn,
              ...operation.patch,
            };

            if (operation.patch.format && !operation.patch.type) {
              updatedColumn.type = operation.patch.format;
            }
            if (operation.patch.type && !operation.patch.format) {
              updatedColumn.format = operation.patch.type;
            }

            table.columns = table.columns.map((column, index) =>
              index === columnIndex ? updatedColumn : column
            );

            operationsApplied.push({
              action: operation.action,
              tableId: operation.tableId,
              detail: `Updated column ${operation.columnName}.`,
              status: 'success',
            });
            break;
          }
        }
      }

      return {
        ok,
        tables: cloneTables(schemaState),
        operationsApplied,
      };
    };

    const tools = {
      listSchemas: tool({
        description:
          'List database schemas in the workspace. Use this only when user explicitly asks about schemas.',
        inputSchema: listSchemasParams,
        execute: async ({
          includeSystem,
        }: z.infer<typeof listSchemasParams>) => {
          const schemas = new Set<string>();
          Object.values(schemaState).forEach((table) => {
            const schema = table.schema ?? 'public';
            if (!includeSystem && schema.startsWith('pg_')) {
              return;
            }
            schemas.add(schema);
          });

          return {
            schemas: Array.from(schemas).sort(),
            total: schemas.size,
          };
        },
      }),
      listTables: tool({
        description:
          'List all tables in the workspace. IMPORTANT: Use includeColumns:true to get full column details including FK relationships (column.fk property). This is more efficient than calling getTableDetails multiple times. Always explain results conversationally.',
        inputSchema: listTablesParams,
        execute: async (params: z.infer<typeof listTablesParams>) => {
          const {
            schema,
            search,
            includeColumns,
            limit = 100,
            offset = 0,
          } = params;
          const entries = Object.entries(schemaState);
          const filtered = entries.filter(([tableId, table]) => {
            if (schema) {
              const tableSchema = table.schema ?? 'public';
              if (tableSchema !== schema) {
                return false;
              }
            }

            if (search) {
              const target = search.toLowerCase();
              if (
                !tableId.toLowerCase().includes(target) &&
                !(table.columns ?? []).some((column) =>
                  column.title.toLowerCase().includes(target)
                )
              ) {
                return false;
              }
            }

            return true;
          });

          const sliced = filtered.slice(offset, offset + limit);
          const result = {
            total: filtered.length,
            tables: sliced.map(([tableId, table]) => ({
              id: tableId,
              schema: table.schema ?? 'public',
              title: table.title,
              isView: table.is_view ?? false,
              columnCount: table.columns?.length ?? 0,
              columns: includeColumns ? table.columns ?? [] : undefined,
            })),
          };

          console.log(`[listTables] Returning ${result.tables.length} of ${result.total} tables (includeColumns: ${includeColumns})`);
          return result;
        },
      }),
      getTableDetails: tool({
        description:
          'Get full details of a single specific table. WARNING: If you already called listTables with includeColumns:true, DO NOT use this - you already have the data! Only use when you need details of ONE specific table.',
        inputSchema: getTableParams,
        execute: async ({ tableId }: z.infer<typeof getTableParams>) => {
          const table = schemaState[tableId];
          if (!table) {
            return {
              ok: false,
              message: `Table ${tableId} not found.`,
            };
          }

          return {
            ok: true,
            table,
          };
        },
      }),
      modifySchema: tool({
        description:
          'Apply schema changes (create/drop/alter tables and columns). Returns the complete updated schema state with ok:true on success. IMPORTANT: After this succeeds, the changes ARE applied - do NOT call listTables to verify!',
        inputSchema: modifySchemaParams,
        execute: async (input: ModifySchemaInput) => {
          const result = applySchemaOperations(input);

          // Add summary for better AI understanding
          const successCount = result.operationsApplied.filter(
            (op) => op.status === 'success'
          ).length;

          console.log(`[modifySchema] Applied ${successCount} of ${input.operations.length} operations. Schema now has ${Object.keys(schemaState).length} tables.`);

          return {
            ...result,
            summary: {
              totalTables: Object.keys(schemaState).length,
              operationsRequested: input.operations.length,
              operationsSuccessful: successCount,
              operationsFailed: result.operationsApplied.length - successCount,
              message: result.ok
                ? `Successfully applied ${successCount} operations. Database now has ${Object.keys(schemaState).length} tables.`
                : `Failed to apply some operations. Check operationsApplied for details.`,
            },
          };
        },
      }),
    };

    // Convert UIMessages to ModelMessages
    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      maxRetries: 1,
      temperature: 0.7,
      tools,
      // Enable autonomous multi-step tool calling (like Cline's agentic loop)
      stopWhen: stepCountIs(20), // AI can make up to 20 autonomous tool calls
      onStepFinish: ({ toolCalls, toolResults, finishReason, text }) => {
        console.log(`[Step] Tool calls: ${toolCalls?.length || 0}, Results: ${toolResults?.length || 0}, Text: ${text ? text.substring(0, 50) : 'none'}, Finish: ${finishReason}`);
        if (toolCalls) {
          toolCalls.forEach((call, i) => {
            console.log(`  Tool ${i + 1}: ${call.toolName}`);
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[api/chat] unexpected error:', error);
    const message =
      error instanceof Error ? error.message : 'Unexpected server error';
    return new Response(message, { status: 500 });
  }
}


