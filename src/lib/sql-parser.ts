import { TableState, Column } from './types';

/**
 * Parse PostgreSQL CREATE TABLE statements into TableState format
 */
export function parseSQLSchema(sql: string): TableState {
  const tables: TableState = {};

  // Remove comments (both -- and /* */)
  let cleanedSQL = sql
    .replace(/--[^\n]*/g, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

  // Split into individual statements
  const statements = cleanedSQL.split(';').filter(s => s.trim());

  for (const statement of statements) {
    const trimmed = statement.trim();

    // Match CREATE TABLE statements
    // Improved regex to handle schema prefixes (e.g., public.users) and quoted identifiers
    const createTableMatch = trimmed.match(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s*\(/i
    );

    if (createTableMatch) {
      // Extract schema and table name
      const schemaName = createTableMatch[1] || 'public'; // Default to 'public' if no schema specified
      const tableName = createTableMatch[2]; // Always use the actual table name, not schema
      const columns = parseColumns(statement);

      tables[tableName] = {
        title: tableName,
        is_view: false,
        columns: columns,
        position: { x: 0, y: 0 },
        schema: schemaName
      };
    }

    // Match CREATE VIEW statements
    // Improved regex to handle schema prefixes and quoted identifiers
    const createViewMatch = trimmed.match(
      /create\s+(?:or\s+replace\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s+as/i
    );

    if (createViewMatch) {
      const schemaName = createViewMatch[1] || 'public'; // Default to 'public' if no schema specified
      const viewName = createViewMatch[2]; // Use actual view name, not schema

      tables[viewName] = {
        title: viewName,
        is_view: true,
        columns: [],
        position: { x: 0, y: 0 },
        schema: schemaName
      };
    }
  }

  // Second pass: Process ALL ALTER TABLE statements for foreign keys and primary keys
  for (const statement of statements) {
    const trimmed = statement.trim();

    // Match ALTER TABLE statements (handle schema prefixes like public.users or just users)
    const alterTableMatch = trimmed.match(/alter\s+table\s+(?:["']?(\w+)["']?\.)?["']?(\w+)["']?/i);

    if (alterTableMatch) {
      const tableName = alterTableMatch[2]; // Use the table name, ignore schema prefix

      // Parse foreign keys
      parseForeignKeysFromAlter(tables, tableName, trimmed);

      // Parse primary keys from ALTER TABLE statements
      parsePrimaryKeysFromAlter(tables, tableName, trimmed);
    }
  }

  return tables;
}

/**
 * Parse columns from CREATE TABLE statement
 */
function parseColumns(createStatement: string): Column[] {
  const columns: Column[] = [];

  // Extract the content between parentheses
  const match = createStatement.match(/\(([\s\S]+)\)/);
  if (!match) return columns;

  const content = match[1];

  // Split by commas, but be careful with nested parentheses
  const columnDefs = splitByComma(content);

  for (const def of columnDefs) {
    const trimmed = def.trim();

    // Skip constraint definitions
    if (
      trimmed.match(/^constraint\s+/i) ||
      trimmed.match(/^primary\s+key\s*\(/i) ||
      trimmed.match(/^foreign\s+key\s*\(/i) ||
      trimmed.match(/^unique\s*\(/i) ||
      trimmed.match(/^check\s*\(/i)
    ) {
      continue;
    }

    const column = parseColumnDefinition(trimmed);
    if (column) {
      columns.push(column);
    }
  }

  return columns;
}

/**
 * Parse a single column definition
 */
function parseColumnDefinition(def: string): Column | null {
  // Extract column name (supporting quoted identifiers with spaces/special chars)
  // Matches: "column name", 'column name', or unquoted_column_name
  const nameMatch = def.match(
    /^("([^"]+)"|'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))\s+(.+)/i
  );

  if (!nameMatch) return null;

  // Use the correct capture group depending on quoted/unquoted
  const columnName =
    nameMatch[2] !== undefined
      ? nameMatch[2] // double-quoted
      : nameMatch[3] !== undefined
      ? nameMatch[3] // single-quoted
      : nameMatch[4]; // unquoted

  const rest = nameMatch[5];

  // Extract data type
  const typeMatch = rest.match(/^(\w+)(?:\s*\([\d,\s]+\))?/i);
  if (!typeMatch) return null;

  const dataType = typeMatch[0].trim();

  // Check for constraints
  const isPrimaryKey = /primary\s+key/i.test(rest);
  const isNotNull = /not\s+null/i.test(rest);

  // Check for foreign key reference
  let foreignKey: string | undefined;
  const fkMatch = rest.match(/references\s+["']?(\w+)["']?\s*\(["']?(\w+)["']?\)/i);
  if (fkMatch) {
    foreignKey = `${fkMatch[1]}.${fkMatch[2]}`;
  }

  // Check for default value - improved to handle quoted strings and complex expressions
  let defaultValue: any;
  // Match quoted strings, parenthesized expressions, or unquoted values
  const defaultMatch = rest.match(
    /default\s+((?:'[^']*'|"[^"]*"|\([^)]+\)|[^,\s]+(?:\s*[^,]*?)))/i
  );

  if (defaultMatch) {
    let val = defaultMatch[1].trim();
    // Remove surrounding quotes if present for string literals
    if ((val.startsWith("'") && val.endsWith("'")) ||
        (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    defaultValue = val;
  }

  // Map PostgreSQL types to format
  const format = mapPostgreSQLType(dataType);

  return {
    title: columnName,
    format: format,
    type: determineType(format),
    default: defaultValue,
    required: isNotNull || isPrimaryKey,
    pk: isPrimaryKey,
    fk: foreignKey
  };
}

/**
 * Parse foreign keys from ALTER TABLE statements
 */
function parseForeignKeysFromAlter(tables: TableState, tableName: string, alterStmt: string): void {
  // Match: ALTER TABLE "table" ADD CONSTRAINT "name" FOREIGN KEY("col") REFERENCES "ref_table"("ref_col")
  const fkMatch = alterStmt.match(/add\s+constraint\s+["']?\w+["']?\s+foreign\s+key\s*\(["']?(\w+)["']?\)\s*references\s+["']?(\w+)["']?\s*\(["']?(\w+)["']?\)/i);

  if (fkMatch && tables[tableName]) {
    const columnName = fkMatch[1];
    const refTable = fkMatch[2];
    const refColumn = fkMatch[3];

    // Find the column and add FK reference
    const column = tables[tableName].columns?.find(c => c.title === columnName);
    if (column) {
      column.fk = `${refTable}.${refColumn}`;
    }
  }
}

/**
 * Parse primary keys from ALTER TABLE statements
 */
function parsePrimaryKeysFromAlter(tables: TableState, tableName: string, alterStmt: string): void {
  // Match: ALTER TABLE "table" ADD PRIMARY KEY("col")
  const pkMatch = alterStmt.match(/add\s+primary\s+key\s*\(["']?(\w+)["']?\)/i);

  if (pkMatch && tables[tableName]) {
    const columnName = pkMatch[1];

    // Find the column and mark as primary key
    const column = tables[tableName].columns?.find(c => c.title === columnName);
    if (column) {
      column.pk = true;
      column.required = true;
    }
  }
}

/**
 * Split string by comma, respecting parentheses
 */
function splitByComma(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(current);
  }

  return result;
}

/**
 * Map PostgreSQL data types to internal format
 */
function mapPostgreSQLType(pgType: string): string {
  const type = pgType.toLowerCase();

  // Serial types
  if (type.includes('serial')) return 'integer';

  // Integer types
  if (type === 'smallint') return 'int2';
  if (type === 'integer' || type === 'int') return 'int4';
  if (type === 'bigint') return 'int8';

  // Numeric types
  if (type.includes('numeric') || type.includes('decimal')) return 'numeric';
  if (type === 'real') return 'float4';
  if (type === 'double precision' || type === 'double') return 'float8';
  if (type.includes('float')) return 'float8'; // FLOAT(n) maps to float8

  // String types
  if (type.includes('varchar') || type.includes('character varying')) return 'varchar';
  if (type.includes('char') || type.includes('character')) return 'char';
  if (type === 'text') return 'text';

  // Boolean
  if (type === 'boolean' || type === 'bool') return 'bool';

  // Date/Time types
  if (type === 'date') return 'date';
  if (type === 'time') return 'time';
  if (type.includes('timestamp')) {
    if (type.includes('with time zone') || type.includes('timestamptz')) {
      return 'timestamptz';
    }
    return 'timestamp';
  }

  // UUID
  if (type === 'uuid') return 'uuid';

  // JSON types
  if (type === 'json') return 'json';
  if (type === 'jsonb') return 'jsonb';

  // Array types
  if (type.includes('[]')) return type;

  // Default: return as-is
  return type;
}

/**
 * Determine the type category from format
 */
function determineType(format: string): string {
  const f = format.toLowerCase();

  // Numeric types
  if (f.includes('int') || f.includes('serial') || f === 'numeric' || f.includes('float')) {
    return 'number';
  }

  // String types
  if (f.includes('char') || f === 'text') {
    return 'string';
  }

  // Boolean
  if (f === 'bool') {
    return 'boolean';
  }

  // JSON
  if (f === 'json' || f === 'jsonb') {
    return 'object';
  }

  // Array
  if (f.includes('[]')) {
    return 'array';
  }

  // Default
  return 'string';
}
