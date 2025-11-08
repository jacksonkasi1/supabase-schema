import { NextResponse } from 'next/server';
import { Client } from 'pg';

export const runtime = 'nodejs';

const EXCLUDED_SCHEMAS = new Set(['pg_catalog', 'information_schema', 'pg_toast']);

type TableRow = {
  schema: string;
  table_name: string;
  relkind: 'r' | 'v' | 'm';
};

type ColumnRow = {
  schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  is_not_null: boolean;
  column_default: string | null;
};

type PrimaryKeyRow = {
  schema: string;
  table_name: string;
  column_name: string;
};

type ForeignKeyRow = {
  schema: string;
  table_name: string;
  column_name: string;
  ref_schema: string;
  ref_table: string;
  ref_column: string;
};

const mapPgTypeToOpenApi = (pgType: string) => {
  const normalized = pgType.toLowerCase();

  if (
    normalized.includes('int') ||
    normalized.includes('numeric') ||
    normalized.includes('decimal') ||
    normalized.includes('double') ||
    normalized.includes('real') ||
    normalized.includes('serial')
  ) {
    return { type: 'number', format: pgType };
  }

  if (normalized.includes('bool')) {
    return { type: 'boolean', format: pgType };
  }

  if (normalized.includes('json')) {
    return { type: 'object', format: pgType };
  }

  if (normalized.includes('array')) {
    return { type: 'array', format: pgType };
  }

  if (
    normalized.includes('timestamp') ||
    normalized.includes('time') ||
    normalized.includes('date')
  ) {
    return { type: 'string', format: pgType };
  }

  return { type: 'string', format: pgType };
};

const toDefinitionKey = (schema: string, table: string) => {
  return schema === 'public' ? table : `${schema}.${table}`;
};

export async function POST(req: Request) {
  let client: Client | null = null;

  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.connectionString !== 'string') {
      return NextResponse.json(
        { error: 'connectionString is required' },
        { status: 400 }
      );
    }

    const { connectionString } = body;

    if (
      !connectionString.startsWith('postgres://') &&
      !connectionString.startsWith('postgresql://')
    ) {
      return NextResponse.json(
        { error: 'Only Postgres connection strings are supported' },
        { status: 400 }
      );
    }

    client = new Client({ connectionString });
    await client.connect();

    const tablesResult = await client.query<TableRow>(
      `
        SELECT
          n.nspname AS schema,
          c.relname AS table_name,
          c.relkind
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND c.relkind IN ('r', 'v', 'm')
        ORDER BY n.nspname, c.relname;
      `
    );

    if (tablesResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No tables or views found in the provided database' },
        { status: 404 }
      );
    }

    const columnsResult = await client.query<ColumnRow>(
      `
        SELECT
          n.nspname AS schema,
          c.relname AS table_name,
          a.attname AS column_name,
          pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
          a.attnotnull AS is_not_null,
          pg_catalog.pg_get_expr(ad.adbin, ad.adrelid) AS column_default
        FROM pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND c.relkind IN ('r', 'v', 'm')
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY n.nspname, c.relname, a.attnum;
      `
    );

    const pkResult = await client.query<PrimaryKeyRow>(
      `
        SELECT
          n.nspname AS schema,
          c.relname AS table_name,
          a.attname AS column_name
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN unnest(con.conkey) AS cols(attnum) ON true
        JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = cols.attnum
        WHERE con.contype = 'p'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND c.relkind IN ('r', 'v', 'm');
      `
    );

    const fkResult = await client.query<ForeignKeyRow>(
      `
        SELECT
          ns.nspname AS schema,
          rel.relname AS table_name,
          att.attname AS column_name,
          nsp_r.nspname AS ref_schema,
          rel_r.relname AS ref_table,
          att_r.attname AS ref_column
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = cols.attnum
        JOIN unnest(con.confkey) WITH ORDINALITY AS fcols(attnum, ord) ON fcols.ord = cols.ord
        JOIN pg_class rel_r ON rel_r.oid = con.confrelid
        JOIN pg_namespace nsp_r ON nsp_r.oid = rel_r.relnamespace
        JOIN pg_attribute att_r ON att_r.attrelid = rel_r.oid AND att_r.attnum = fcols.attnum
        WHERE con.contype = 'f'
          AND ns.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND rel.relkind IN ('r', 'v', 'm');
      `
    );

    const pkMap = new Map<string, Set<string>>();
    pkResult.rows.forEach((row: PrimaryKeyRow) => {
      const key = toDefinitionKey(row.schema, row.table_name);
      if (!pkMap.has(key)) {
        pkMap.set(key, new Set());
      }
      pkMap.get(key)!.add(row.column_name);
    });

    const fkMap = new Map<
      string,
      Array<{ refSchema: string; refTable: string; refColumn: string }>
    >();
    fkResult.rows.forEach((row: ForeignKeyRow) => {
      const key = `${toDefinitionKey(row.schema, row.table_name)}.${row.column_name}`;
      if (!fkMap.has(key)) {
        fkMap.set(key, []);
      }
      fkMap.get(key)!.push({
        refSchema: row.ref_schema,
        refTable: row.ref_table,
        refColumn: row.ref_column,
      });
    });

    const groupedColumns = new Map<
      string,
      Array<{
        column: string;
        dataType: string;
        isNotNull: boolean;
        defaultValue: string | null;
      }>
    >();

    columnsResult.rows.forEach((row: ColumnRow) => {
      const key = toDefinitionKey(row.schema, row.table_name);
      if (!groupedColumns.has(key)) {
        groupedColumns.set(key, []);
      }
      groupedColumns.get(key)!.push({
        column: row.column_name,
        dataType: row.data_type,
        isNotNull: row.is_not_null,
        defaultValue: row.column_default,
      });
    });

    const definitions: Record<string, any> = {};
    const paths: Record<string, any> = {};

    tablesResult.rows.forEach((table: TableRow) => {
      if (EXCLUDED_SCHEMAS.has(table.schema)) {
        return;
      }

      const definitionKey = toDefinitionKey(table.schema, table.table_name);
      const columns = groupedColumns.get(definitionKey) ?? [];
      const pkColumns = pkMap.get(definitionKey) ?? new Set<string>();

      const properties: Record<string, any> = {};
      const required = new Set<string>();

      columns.forEach((col) => {
        const { type, format } = mapPgTypeToOpenApi(col.dataType);
        const fkCandidates =
          fkMap.get(`${definitionKey}.${col.column}`) ?? [];

        let description = '';

        if (pkColumns.has(col.column)) {
          description = '<pk/>';
        }

        if (fkCandidates.length > 0) {
          const fkDescriptions = fkCandidates.map((fk) => {
            const schemaPrefix =
              fk.refSchema && fk.refSchema !== 'public'
                ? `${fk.refSchema}.`
                : '';
            return `\`${schemaPrefix}${fk.refTable}.${fk.refColumn}\``;
          });

          description = description
            ? `${description} ${fkDescriptions.join(', ')}`
            : fkDescriptions.join(', ');
        }

        properties[col.column] = {
          type,
          format,
          default: col.defaultValue ?? undefined,
          description: description || undefined,
        };

        if (col.isNotNull) {
          required.add(col.column);
        }
      });

      definitions[definitionKey] = {
        type: 'object',
        properties,
        required: required.size > 0 ? Array.from(required) : undefined,
      };

      const isView = table.relkind === 'v' || table.relkind === 'm';
      paths[`/${definitionKey}`] = isView
        ? { get: {} }
        : { get: {}, post: {}, patch: {}, delete: {} };
    });

    return NextResponse.json({
      definitions,
      paths,
      metadata: {
        tableCount: Object.keys(definitions).length,
      },
    });
  } catch (error) {
    console.error('[schema][postgres]', error);
    const message =
      error instanceof Error ? error.message : 'Failed to introspect schema';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (err) {
        console.error('[schema][postgres] error closing connection', err);
      }
    }
  }
}


