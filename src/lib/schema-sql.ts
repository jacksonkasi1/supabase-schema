import { parseSQLSchema } from './sql-parser';
import {
  TableState,
  Table,
  Column,
  EnumTypeDefinition,
  TableConstraint,
  TableIndex,
  ForeignKeyReference,
} from './types';

export interface SchemaSqlParseResult {
  tables: TableState;
  enumTypes: Record<string, EnumTypeDefinition>;
  error?: string;
}

type EnumMap = Record<string, EnumTypeDefinition>;

export function generateSchemaSQL(
  tables: TableState,
  enumTypes: EnumMap = {},
  options?: { tableId?: string }
): string {
  if (options?.tableId) {
    const table = tables[options.tableId];
    if (!table) {
      return '-- Selected table not found in schema';
    }
    return generateSingleTableSQL(options.tableId, table, enumTypes);
  }

  const lines: string[] = [];
  const mergedEnums = mergeEnumDefinitions(tables, enumTypes);

  if (Object.keys(mergedEnums).length > 0) {
    lines.push('-- Enum Types');
    Object.values(sortEnumMap(mergedEnums)).forEach((enumDef) => {
      lines.push(renderEnumDefinition(enumDef));
    });
    lines.push('');
  }

  const sortedTables: Array<[string, Table]> = sortTables(tables);
  const tableStatements: string[] = [];
  const constraintStatements: string[] = [];
  const indexStatements: string[] = [];

  sortedTables.forEach(([tableId, table]) => {
    tableStatements.push(...renderTableDefinition(tableId, table));
  });

  sortedTables.forEach(([tableId, table]) => {
    const constraints = renderConstraintStatements(tableId, table);
    if (constraints.length > 0) {
      constraintStatements.push(...constraints);
    }
  });

  sortedTables.forEach(([tableId, table]) => {
    const indexes = renderIndexStatements(tableId, table);
    if (indexes.length > 0) {
      indexStatements.push(...indexes);
    }
  });

  if (tableStatements.length > 0) {
    lines.push('-- Tables');
    lines.push(...insertBlankLines(tableStatements));
  }

  if (constraintStatements.length > 0) {
    if (lines.length > 0) {
      lines.push('');
    }
    lines.push('-- Constraints');
    lines.push(...insertBlankLines(constraintStatements));
  }

  if (indexStatements.length > 0) {
    if (lines.length > 0) {
      lines.push('');
    }
    lines.push('-- Indexes');
    lines.push(...insertBlankLines(indexStatements));
  }

  return lines.join('\n').trim();
}

export function generateTableSQL(
  tableId: string,
  table: Table,
  enumTypes: EnumMap = {}
): string {
  const lines: string[] = [];
  const usedEnums = collectTableEnums(table, enumTypes);
  if (Object.keys(usedEnums).length > 0) {
    lines.push('-- Enum Types in use');
    Object.values(sortEnumMap(usedEnums)).forEach((enumDef) => {
      lines.push(renderEnumDefinition(enumDef));
    });
    lines.push('');
  }

  lines.push(...renderTableDefinition(tableId, table));
  const constraints = renderConstraintStatements(tableId, table);
  if (constraints.length > 0) {
    lines.push('', ...constraints);
  }
  const indexes = renderIndexStatements(tableId, table);
  if (indexes.length > 0) {
    lines.push('', ...indexes);
  }

  return lines.join('\n');
}

export function parseSchemaSQL(sql: string): SchemaSqlParseResult {
  try {
    const cleaned = stripComments(sql);
    const tables = parseSQLSchema(cleaned);
    const statements = splitStatements(cleaned);
    const enumTypes = extractEnumTypes(statements);
    const constraints = extractConstraints(statements);
    applyConstraintsToTables(tables, constraints);
    const indexes = extractIndexes(statements);
    applyIndexesToTables(tables, indexes);

    return {
      tables,
      enumTypes,
    };
  } catch (error) {
    return {
      tables: {},
      enumTypes: {},
      error: error instanceof Error ? error.message : 'Failed to parse SQL',
    };
  }
}

function generateSingleTableSQL(
  tableId: string,
  table: Table,
  enumTypes: EnumMap
): string {
  const lines: string[] = [];
  const usedEnums = collectTableEnums(table, enumTypes);
  if (Object.keys(usedEnums).length > 0) {
    lines.push('-- Enum Types in use');
    Object.values(sortEnumMap(usedEnums)).forEach((enumDef) => {
      lines.push(renderEnumDefinition(enumDef));
    });
    lines.push('');
  }

  lines.push(...renderTableDefinition(tableId, table));
  const constraints = renderConstraintStatements(tableId, table);
  if (constraints.length > 0) {
    lines.push('', ...constraints);
  }
  const indexes = renderIndexStatements(tableId, table);
  if (indexes.length > 0) {
    lines.push('', ...indexes);
  }
  return lines.join('\n');
}

function insertBlankLines(statements: string[]): string[] {
  const result: string[] = [];
  statements.forEach((statement, idx) => {
    result.push(statement);
    if (idx !== statements.length - 1) {
      result.push('');
    }
  });
  return result;
}

function mergeEnumDefinitions(
  tables: TableState,
  enumTypes: EnumMap
): EnumMap {
  const merged: EnumMap = { ...enumTypes };
  Object.values(tables).forEach((table) => {
    (table.columns ?? []).forEach((column) => {
      if (column.enumTypeName && column.enumValues?.length) {
        const { schema, name, key } = parseEnumIdentifier(column.enumTypeName);
        if (!merged[key]) {
          merged[key] = {
            name,
            schema,
            values: column.enumValues,
          };
        }
      }
    });
  });
  return merged;
}

function collectTableEnums(table: Table, enumTypes: EnumMap): EnumMap {
  const used: EnumMap = {};
  (table.columns ?? []).forEach((column) => {
    if (!column.enumTypeName) return;
    const { schema, name, key } = parseEnumIdentifier(column.enumTypeName);
    if (enumTypes[key]) {
      used[key] = enumTypes[key];
    } else if (column.enumValues?.length) {
      used[key] = {
        name,
        schema,
        values: column.enumValues,
      };
    }
  });
  return used;
}

function sortTables(tables: TableState): Array<[string, Table]> {
  return Object.entries(tables).sort(([aKey], [bKey]) =>
    aKey.localeCompare(bKey)
  );
}

function sortEnumMap(enumMap: EnumMap): EnumTypeDefinition[] {
  return Object.values(enumMap).sort((a, b) => {
    const schemaA = a.schema ?? '';
    const schemaB = b.schema ?? '';
    if (schemaA === schemaB) {
      return a.name.localeCompare(b.name);
    }
    return schemaA.localeCompare(schemaB);
  });
}

function renderEnumDefinition(enumDef: EnumTypeDefinition): string {
  const schemaPrefix = enumDef.schema
    ? `${quoteIdentifier(enumDef.schema)}.`
    : '';
  const values = enumDef.values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
  return `CREATE TYPE ${schemaPrefix}${quoteIdentifier(enumDef.name)} AS ENUM (${values});`;
}

function renderTableDefinition(tableId: string, table: Table): string[] {
  const lines: string[] = [];
  const identity = resolveTableIdentity(tableId, table);
  const columns = table.columns ?? [];

  lines.push(`CREATE TABLE ${identity.qualified} (`);

  columns.forEach((column, index) => {
    const suffix = index === columns.length - 1 ? '' : ',';
    lines.push(`  ${renderColumnDefinition(column)}${suffix}`);
  });

  lines.push(');');
  return lines;
}

function renderColumnDefinition(column: Column): string {
  const pieces: string[] = [quoteIdentifier(column.title)];
  pieces.push(resolveColumnType(column));
  if (column.required) {
    pieces.push('NOT NULL');
  }
  if (column.default !== undefined && column.default !== null && column.default !== '') {
    pieces.push(`DEFAULT ${column.default}`);
  }
  return pieces.join(' ');
}

function resolveColumnType(column: Column): string {
  if (column.enumTypeName) {
    const { schema, name } = parseEnumIdentifier(column.enumTypeName);
    return schema
      ? `${quoteIdentifier(schema)}.${quoteIdentifier(name)}`
      : quoteIdentifier(name);
  }

  const type = column.format || column.type || 'text';
  return type.toUpperCase();
}

function renderConstraintStatements(tableId: string, table: Table): string[] {
  const statements: string[] = [];
  const identity = resolveTableIdentity(tableId, table);
  const constraints = table.constraints ?? [];

  const primaryConstraints = constraints.filter((c) => c.type === 'primary_key');
  if (primaryConstraints.length > 0) {
    primaryConstraints.forEach((constraint, idx) => {
      const statement = buildPrimaryKeyStatement(identity, constraint, idx);
      if (statement) statements.push(statement);
    });
  } else {
    const derived = derivePrimaryKeyConstraint(table);
    if (derived) {
      const statement = buildPrimaryKeyStatement(identity, derived, 0);
      if (statement) statements.push(statement);
    }
  }

  const foreignConstraints = constraints.filter((c) => c.type === 'foreign_key');
  const derivedFks = deriveForeignKeyConstraints(table, foreignConstraints);
  [...foreignConstraints, ...derivedFks].forEach((constraint, idx) => {
    const statement = buildForeignKeyStatement(identity, constraint, idx);
    if (statement) statements.push(statement);
  });

  const uniqueConstraints = constraints.filter((c) => c.type === 'unique');
  const derivedUniques = deriveUniqueConstraints(table, uniqueConstraints);
  [...uniqueConstraints, ...derivedUniques].forEach((constraint, idx) => {
    const statement = buildUniqueStatement(identity, constraint, idx);
    if (statement) statements.push(statement);
  });

  const checkConstraints = constraints.filter((c) => c.type === 'check');
  checkConstraints.forEach((constraint, idx) => {
    const statement = buildCheckStatement(identity, constraint, idx);
    if (statement) statements.push(statement);
  });

  return statements;
}

function renderIndexStatements(tableId: string, table: Table): string[] {
  const identity = resolveTableIdentity(tableId, table);
  const indexes = table.indexes ?? [];
  const sorted = [...indexes].sort((a, b) => a.name.localeCompare(b.name));

  return sorted.map((indexDef) => {
    const unique = indexDef.unique ? 'UNIQUE ' : '';
    const using = indexDef.using ? ` USING ${indexDef.using}` : '';
    const columns = indexDef.columns?.length
      ? indexDef.columns.join(', ')
      : '';
    const where = indexDef.where ? ` WHERE ${indexDef.where}` : '';
    return `CREATE ${unique}INDEX ${quoteIdentifier(indexDef.name)} ON ${identity.qualified}${using} (${columns})${where};`;
  });
}

function resolveTableIdentity(tableId: string, table: Table) {
  const keyParts = splitIdentifier(tableId);
  const schemaFromKey = keyParts.length > 1 ? keyParts[0] : undefined;
  const titleParts = splitIdentifier(table.title || '');
  const nameFromTitle = titleParts[titleParts.length - 1];
  const schema = table.schema || schemaFromKey || 'public';
  const name = nameFromTitle || keyParts[keyParts.length - 1] || tableId;
  const qualified = schema
    ? `${quoteIdentifier(schema)}.${quoteIdentifier(name)}`
    : quoteIdentifier(name);

  return { schema, name, qualified };
}

function buildPrimaryKeyStatement(
  identity: { qualified: string; name: string },
  constraint: TableConstraint,
  index: number
): string | null {
  if (!constraint.columns || constraint.columns.length === 0) {
    return null;
  }
  const constraintName = quoteIdentifier(
    constraint.name || `${identity.name}_pkey_${index}`
  );
  const columns = constraint.columns.map((column) => quoteIdentifier(column)).join(', ');
  return `ALTER TABLE ${identity.qualified} ADD CONSTRAINT ${constraintName} PRIMARY KEY (${columns});`;
}

function derivePrimaryKeyConstraint(table: Table): TableConstraint | null {
  const pkColumns = (table.columns || [])
    .filter((column) => column.pk)
    .map((column) => column.title);
  if (pkColumns.length === 0) {
    return null;
  }
  return {
    type: 'primary_key',
    columns: pkColumns,
  };
}

function buildForeignKeyStatement(
  identity: { qualified: string; name: string },
  constraint: TableConstraint,
  idx: number
): string | null {
  if (
    constraint.type !== 'foreign_key' ||
    !constraint.columns?.length ||
    !constraint.reference ||
    !constraint.reference.columns?.length
  ) {
    return null;
  }
  const constraintName = quoteIdentifier(
    constraint.name || `${identity.name}_fk_${idx}`
  );
  const columns = constraint.columns.map((col) => quoteIdentifier(col)).join(', ');
  const ref = constraint.reference;
  const refQualified = ref.schema
    ? `${quoteIdentifier(ref.schema)}.${quoteIdentifier(ref.table)}`
    : quoteIdentifier(ref.table);
  const refCols = (ref.columns || []).map((col) => quoteIdentifier(col)).join(', ');
  const onDelete = ref.onDelete ? ` ON DELETE ${ref.onDelete}` : '';
  const onUpdate = ref.onUpdate ? ` ON UPDATE ${ref.onUpdate}` : '';
  return `ALTER TABLE ${identity.qualified} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${columns}) REFERENCES ${refQualified} (${refCols})${onDelete}${onUpdate};`;
}

function deriveForeignKeyConstraints(
  table: Table,
  existing: TableConstraint[]
): TableConstraint[] {
  const derived: TableConstraint[] = [];
  const existingSingleColumn = new Set(
    existing
      .filter((c) => c.columns && c.columns.length === 1)
      .map((c) => normalizeName(c.columns![0]))
  );

  (table.columns ?? []).forEach((column) => {
    if (!column.fk) return;
    const normalized = normalizeName(column.title);
    if (existingSingleColumn.has(normalized)) {
      return;
    }
    const reference = parseForeignKeyString(column.fk);
    if (!reference) return;
    derived.push({
      type: 'foreign_key',
      columns: [column.title],
      reference,
    });
  });

  return derived;
}

function buildUniqueStatement(
  identity: { qualified: string; name: string },
  constraint: TableConstraint,
  idx: number
): string | null {
  if (!constraint.columns || constraint.columns.length === 0) {
    return null;
  }
  const constraintName = quoteIdentifier(
    constraint.name || `${identity.name}_unique_${idx}`
  );
  const columns = constraint.columns.map((column) => quoteIdentifier(column)).join(', ');
  return `ALTER TABLE ${identity.qualified} ADD CONSTRAINT ${constraintName} UNIQUE (${columns});`;
}

function deriveUniqueConstraints(
  table: Table,
  existing: TableConstraint[]
): TableConstraint[] {
  const derived: TableConstraint[] = [];
  const existingSingles = new Set(
    existing
      .filter((c) => c.columns && c.columns.length === 1)
      .map((c) => normalizeName(c.columns![0]))
  );

  (table.columns ?? []).forEach((column) => {
    if (!column.unique) return;
    if (existingSingles.has(normalizeName(column.title))) {
      return;
    }
    derived.push({
      type: 'unique',
      columns: [column.title],
    });
  });

  return derived;
}

function buildCheckStatement(
  identity: { qualified: string; name: string },
  constraint: TableConstraint,
  idx: number
): string | null {
  if (!constraint.expression) {
    return null;
  }
  const constraintName = quoteIdentifier(
    constraint.name || `${identity.name}_check_${idx}`
  );
  return `ALTER TABLE ${identity.qualified} ADD CONSTRAINT ${constraintName} CHECK (${constraint.expression});`;
}

function quoteIdentifier(identifier: string): string {
  if (identifier.startsWith('"') && identifier.endsWith('"')) {
    return identifier;
  }
  const sanitized = identifier.replace(/"/g, '""');
  return `"${sanitized}"`;
}

function stripComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function extractEnumTypes(statements: string[]): EnumMap {
  const enums: EnumMap = {};

  statements.forEach((statement) => {
    const match = statement.match(
      /create\s+type\s+(?:if\s+not\s+exists\s+)?([\w\." ]+)\s+as\s+enum\s*\(([^)]+)\)/i
    );
    if (!match) return;
    const identifier = match[1].trim();
    const valuesChunk = match[2];
    const values: string[] = [];
    const valueRegex = /'([^']*)'/g;
    let valueMatch;
    while ((valueMatch = valueRegex.exec(valuesChunk)) !== null) {
      values.push(valueMatch[1].replace(/''/g, "'"));
    }
    const { schema, name, key } = parseEnumIdentifier(identifier);
    enums[key] = {
      schema,
      name,
      values,
    };
  });

  return enums;
}

interface ParsedConstraint {
  tableKey: string;
  constraint: TableConstraint;
}

function extractConstraints(statements: string[]): ParsedConstraint[] {
  const results: ParsedConstraint[] = [];

  statements.forEach((statement) => {
    if (!/^alter\s+table/i.test(statement)) return;
    const match = statement.match(
      /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(.+?)\s+add\s+(.*)/i
    );
    if (!match) return;
    const identifier = match[1].trim();
    let remainder = match[2].trim();
    let constraintName: string | undefined;

    const constraintMatch = remainder.match(/^constraint\s+([\w"\.]+)/i);
    if (constraintMatch) {
      constraintName = unquoteIdentifier(constraintMatch[1]);
      remainder = remainder.slice(constraintMatch[0].length).trim();
    }

    const lower = remainder.toLowerCase();

    const { schema, name } = parseIdentifier(identifier);
    const tableKey = schema ? `${schema}.${name}` : name;

    if (lower.startsWith('primary key')) {
      const pkMatch = remainder.match(/primary\s+key\s*\(([^)]+)\)/i);
      const columns = pkMatch ? parseColumnList(`(${pkMatch[1]})`) : [];
      if (columns.length > 0) {
        results.push({
          tableKey,
          constraint: {
            name: constraintName,
            type: 'primary_key',
            columns,
          },
        });
      }
    } else if (lower.startsWith('foreign key')) {
      const localMatch = remainder.match(/foreign\s+key\s*\(([^)]+)\)/i);
      const refMatch = remainder.match(
        /references\s+((?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)\s*\(([^)]+)\)/i
      );
      if (localMatch && refMatch) {
        const columns = parseColumnList(`(${localMatch[1]})`);
        const { schema: refSchema, name: refTable } = parseIdentifier(refMatch[1]);
        const refColumns = parseColumnList(`(${refMatch[2]})`);
        const onDeleteMatch = remainder.match(/on\s+delete\s+(\w+)/i);
        const onUpdateMatch = remainder.match(/on\s+update\s+(\w+)/i);
        results.push({
          tableKey,
          constraint: {
            name: constraintName,
            type: 'foreign_key',
            columns,
            reference: {
              schema: refSchema,
              table: refTable,
              columns: refColumns,
              onDelete: onDeleteMatch?.[1]?.toUpperCase(),
              onUpdate: onUpdateMatch?.[1]?.toUpperCase(),
            },
          },
        });
      }
    } else if (lower.startsWith('unique')) {
      const uniqueMatch = remainder.match(/unique\s*\(([^)]+)\)/i);
      const columns = uniqueMatch ? parseColumnList(`(${uniqueMatch[1]})`) : [];
      if (columns.length > 0) {
        results.push({
          tableKey,
          constraint: {
            name: constraintName,
            type: 'unique',
            columns,
          },
        });
      }
    } else if (lower.startsWith('check')) {
      const exprMatch = remainder.match(/check\s*\((.+)\)/i);
      if (exprMatch) {
        results.push({
          tableKey,
          constraint: {
            name: constraintName,
            type: 'check',
            expression: exprMatch[1].trim(),
          },
        });
      }
    }
  });

  return results;
}

interface ParsedIndex {
  tableKey: string;
  index: TableIndex;
}

function extractIndexes(statements: string[]): ParsedIndex[] {
  const results: ParsedIndex[] = [];

  statements.forEach((statement) => {
    if (!/^create\s+.*index/i.test(statement)) return;
    const match = statement.match(
      /create\s+(unique\s+)?index\s+(?:if\s+not\s+exists\s+)?([\w"\.]+)\s+on\s+(?:only\s+)?(.+)/i
    );
    if (!match) return;
    const unique = Boolean(match[1]);
    const indexName = unquoteIdentifier(match[2]);
    const remainder = match[3];

    const { identifier: tableIdentifier, rest: remainderAfterTable } =
      consumeIdentifierWithRest(remainder);
    if (!tableIdentifier) return;
    let afterTable = remainderAfterTable;

    let method: string | null = null;
    const usingMatch = afterTable.match(/using\s+(\w+)/i);
    if (usingMatch) {
      method = usingMatch[1].toUpperCase();
      afterTable = afterTable.replace(usingMatch[0], '').trim();
    }

    const parenIndex = afterTable.indexOf('(');
    if (parenIndex === -1) return;
    const parenResult = extractParenthetical(afterTable, parenIndex);
    if (!parenResult) return;
    const { content, endIndex } = parenResult;
    const columns = splitList(content);
    const trailing = afterTable.slice(endIndex + 1).trim();
    let where: string | null = null;
    const whereMatch = trailing.match(/where\s+(.+)/i);
    if (whereMatch) {
      where = whereMatch[1].trim();
    }

    const { schema, name } = parseIdentifier(tableIdentifier);
    const tableKey = schema ? `${schema}.${name}` : name;

    results.push({
      tableKey,
      index: {
        name: indexName,
        unique,
        using: method,
        columns,
        where,
      },
    });
  });

  return results;
}

function extractParenthetical(value: string, openIndex: number): { content: string; endIndex: number } | null {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = openIndex; i < value.length; i++) {
    const char = value[i];
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (char === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (!inSingle && !inDouble) {
      if (char === '(') depth++;
      if (char === ')') {
        depth--;
        if (depth === 0) {
          return {
            content: value.slice(openIndex + 1, i),
            endIndex: i,
          };
        }
      }
    }
  }
  return null;
}

function splitList(value: string): string[] {
  const items = splitByComma(value);
  return items.map((item) => item.trim()).filter(Boolean);
}

function applyConstraintsToTables(
  tables: TableState,
  constraints: ParsedConstraint[]
) {
  constraints.forEach(({ tableKey, constraint }) => {
    const table = tables[tableKey];
    if (!table) return;
    if (!table.constraints) {
      table.constraints = [];
    }

    const existingIndex = constraint.name
      ? table.constraints.findIndex((c) => c.name === constraint.name)
      : -1;

    if (existingIndex >= 0) {
      table.constraints[existingIndex] = constraint;
    } else {
      table.constraints.push(constraint);
    }

    if (constraint.type === 'primary_key' && constraint.columns) {
      constraint.columns.forEach((columnName) => {
        const column = findColumn(table, columnName);
        if (column) {
          column.pk = true;
          column.required = true;
        }
      });
    }

    if (constraint.type === 'foreign_key' && constraint.columns) {
      if (
        constraint.columns.length === 1 &&
        constraint.reference?.columns?.length === 1
      ) {
        const column = findColumn(table, constraint.columns[0]);
        if (column) {
          const ref = constraint.reference;
          const refTableKey = ref.schema
            ? `${ref.schema}.${ref.table}`
            : ref.table;
          column.fk = `${refTableKey}.${ref.columns![0]}`;
        }
      }
    }

    if (constraint.type === 'unique' && constraint.columns?.length === 1) {
      const column = findColumn(table, constraint.columns[0]);
      if (column) {
        column.unique = true;
      }
    }
  });
}

function applyIndexesToTables(tables: TableState, indexes: ParsedIndex[]) {
  indexes.forEach(({ tableKey, index }) => {
    const table = tables[tableKey];
    if (!table) return;
    if (!table.indexes) {
      table.indexes = [];
    }
    const existingIndex = table.indexes.findIndex((i) => i.name === index.name);
    if (existingIndex >= 0) {
      table.indexes[existingIndex] = index;
    } else {
      table.indexes.push(index);
    }
  });
}

function findColumn(table: Table, name: string): Column | undefined {
  const normalized = normalizeName(name);
  return (table.columns || []).find(
    (column) => normalizeName(column.title) === normalized
  );
}

function parseColumnList(value: string): string[] {
  const content = value.trim();
  if (!content.startsWith('(') || !content.endsWith(')')) {
    return [];
  }
  const inner = content.slice(1, -1);
  return splitList(inner).map((entry) => unquoteIdentifier(entry));
}

function parseEnumIdentifier(value: string): { schema?: string; name: string; key: string } {
  const { schema, name } = parseIdentifier(value);
  const key = schema ? `${schema}.${name}` : name;
  return { schema, name, key };
}

function parseIdentifier(value: string): { schema?: string; name: string } {
  const parts = splitIdentifier(value);
  if (parts.length === 1) {
    return { name: parts[0] };
  }
  return { schema: parts[0], name: parts[1] };
}

function splitIdentifier(value: string): string[] {
  if (!value) return [];
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === '.' && !inQuotes) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }
  return tokens.map((token) => unquoteIdentifier(token));
}

function unquoteIdentifier(value: string): string {
  return value.replace(/"/g, '').trim();
}

function normalizeName(name: string): string {
  return unquoteIdentifier(name).toLowerCase();
}

function consumeIdentifierWithRest(input: string): { identifier: string; rest: string } {
  let inQuotes = false;
  let endIndex = input.length;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (/\s/.test(char) || char === '(')) {
      endIndex = i;
      break;
    }
  }

  const identifier = input.slice(0, endIndex).trim();
  const rest = input.slice(endIndex).trim();
  return { identifier, rest };
}

function parseForeignKeyString(value: string): ForeignKeyReference | null {
  const parts = value.split('.');
  if (parts.length < 2) return null;
  let schema: string | undefined;
  let table: string;
  let column: string;
  if (parts.length === 3) {
    [schema, table, column] = parts;
  } else {
    [table, column] = parts;
  }
  return {
    schema,
    table,
    columns: [column],
  };
}

function splitByComma(value: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      current += char;
      continue;
    }
    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      current += char;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      } else if (char === ',' && depth === 0) {
        result.push(current);
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    result.push(current);
  }

  return result;
}
