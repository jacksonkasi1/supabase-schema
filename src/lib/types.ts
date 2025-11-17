export interface Column {
  title: string;
  format: string;
  type: string;
  default?: any;
  required?: boolean;
  pk?: boolean;
  fk?: string | undefined;
  unique?: boolean;
  enumValues?: string[]; // Values for enum types
  enumTypeName?: string; // Name of the enum type (e.g., "user_status")
  comment?: string; // Comment/note for the column
}

export interface ForeignKeyReference {
  schema?: string;
  table: string;
  columns: string[];
  onDelete?: string;
  onUpdate?: string;
}

export type ConstraintType = 'primary_key' | 'foreign_key' | 'unique' | 'check';

export interface TableConstraint {
  name?: string;
  type: ConstraintType;
  columns?: string[];
  reference?: ForeignKeyReference;
  expression?: string; // Raw expression for check constraints
}

export interface TableIndex {
  name: string;
  columns: string[]; // Raw columns or expressions used by the index
  unique?: boolean;
  using?: string | null;
  where?: string | null;
}

export interface EnumTypeDefinition {
  name: string;
  schema?: string;
  values: string[];
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Table {
  title: string;
  columns?: Column[];
  position?: Position;
  is_view?: boolean;
  schema?: string; // Schema name (e.g., 'public', 'auth', 'storage')
  color?: string; // Header color for the table card
  comment?: string; // Comment/note for the table
  constraints?: TableConstraint[];
  indexes?: TableIndex[];
}

export interface TableState {
  [key: string]: Table;
}

export interface Payload {
  name: string;
  value: string | number;
}

export interface Visual {
  id: string;
  type: string;
  position: Position;
  size: Size;
  [key: string]: any;
}

export interface VisualState {
  [key: string]: Visual;
}

export interface SQLCardItem {
  query: string;
  result?: string;
}

export interface SchemaView {
  translate: {
    x: number;
    y: number;
  };
  scale: number;
}

export interface SupabaseApiKey {
  url: string;
  anon: string;
  last_url: string;
}
