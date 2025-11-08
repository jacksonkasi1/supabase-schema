import { streamText, tool, convertToModelMessages } from 'ai';
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

const SYSTEM_PROMPT = `You are an expert PostgreSQL & Supabase schema assistant embedded inside a diagramming tool.

CRITICAL RULES:
1. ALWAYS respond with conversational text - never end your response with just a tool call
2. After using ANY tool, you MUST explain what you found or did in plain English
3. Use tools to inspect or modify the schema, then describe the results
4. Be concise but always include a text response

When a user asks a question:
- First, use the appropriate tool (listSchemas, listTables, getTableDetails, modifySchema)
- Then, provide a clear text summary of what you found or changed

Examples:
- User: "How many tables do I have?"
  → Call listTables tool → Respond: "You have 8 tables in your schema: users, posts, comments..."

- User: "Delete the users table"
  → Call modifySchema tool → Respond: "I've deleted the users table and all related tables..."

Never fabricate data—only report what the tools return.`;

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
          'List schemas currently present in the in-memory workspace.',
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
          'List tables in the current workspace. Provide schema or search filters when needed.',
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
          return {
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
        },
      }),
      getTableDetails: tool({
        description: 'Fetch the full definition of a single table.',
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
          'Apply schema modifications (create/drop/alter tables and columns).',
        inputSchema: modifySchemaParams,
        execute: async (input: ModifySchemaInput) => applySchemaOperations(input),
      }),
    };

    // Convert UIMessages to ModelMessages
    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      maxRetries: 1,
      tools,
      // The improved system prompt now ensures the model always responds with text
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[api/chat] unexpected error:', error);
    const message =
      error instanceof Error ? error.message : 'Unexpected server error';
    return new Response(message, { status: 500 });
  }
}


