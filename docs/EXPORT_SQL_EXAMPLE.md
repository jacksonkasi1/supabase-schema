# SQL Export Feature

## Overview
The SQL Export feature now directly downloads a `.sql` file instead of showing a modal dialog.

## How It Works

1. Click the **Database icon** (Export SQL) button in the toolbar
2. The file is automatically downloaded as `schema_YYYY-MM-DD.sql`
3. A toast notification confirms the export

## Export Format

The exporter generates PostgreSQL-compatible SQL with:

### Table Creation Order
Tables are automatically sorted using topological sort based on foreign key dependencies. This ensures that referenced tables are created before tables that reference them.

### SQL Structure

```sql
-- Table: table_name
CREATE TABLE "table_name" (
  column_name TYPE [NOT NULL] [DEFAULT value],
  ...
);

ALTER TABLE "table_name" ADD PRIMARY KEY ("pk_column");
ALTER TABLE "table_name" ADD CONSTRAINT "fk_constraint_name"
  FOREIGN KEY ("fk_column") REFERENCES "ref_table" ("ref_column");
```

### Features
- ✅ Quoted identifiers for reserved keywords
- ✅ Proper column types (SERIAL, VARCHAR, INTEGER, etc.)
- ✅ NOT NULL constraints
- ✅ DEFAULT values
- ✅ PRIMARY KEY constraints (via ALTER TABLE)
- ✅ FOREIGN KEY constraints (via ALTER TABLE)
- ✅ Automatic dependency resolution
- ✅ View placeholders (for manual completion)

## Example Output

```sql
-- Table: tbl_organizations
CREATE TABLE "tbl_organizations" (
  id VARCHAR NOT NULL,
  slug VARCHAR NOT NULL DEFAULT 'a2z-cars',
  org_name VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

ALTER TABLE "tbl_organizations" ADD PRIMARY KEY ("id");

-- Table: tbl_customers
CREATE TABLE "tbl_customers" (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  full_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone INT8 NOT NULL,
  dob DATE NOT NULL,
  gender VARCHAR NOT NULL,
  email_reminder_on BOOL NOT NULL DEFAULT '0',
  app_notification_on BOOL NOT NULL DEFAULT '1',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

ALTER TABLE "tbl_customers" ADD PRIMARY KEY ("id");

-- Table: tbl_admins
CREATE TABLE "tbl_admins" (
  id VARCHAR NOT NULL,
  org_id VARCHAR NOT NULL,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

ALTER TABLE "tbl_admins" ADD PRIMARY KEY ("id");
ALTER TABLE "tbl_admins" ADD CONSTRAINT "tbl_admins_org_id_foreign"
  FOREIGN KEY ("org_id") REFERENCES "tbl_organizations" ("id");

-- And so on...
```

## Changes from Previous Implementation

### Before
- Clicked Export SQL → Modal opened with SQL code
- User had to manually copy the code
- User had to paste it into a file
- User had to save the file

### After
- Click Export SQL → File downloads immediately
- Filename includes timestamp: `schema_2025-11-06.sql`
- Toast notification confirms success
- Ready to use immediately

## Error Handling

The exporter includes proper error handling:

- ✅ Check if tables exist before exporting
- ✅ Show error toast if export fails
- ✅ Console logging for debugging
- ✅ Descriptive error messages

## Technical Details

### File: `src/lib/sql-exporter.ts`
- `generateSQLSchema(tables)` - Generates SQL string
- `downloadSQLSchema(tables, filename)` - Triggers download

### File: `src/components/Helper.tsx`
- `handleExportSQL()` - Handles export button click
- Validates tables exist
- Generates timestamp for filename
- Shows toast notifications

## Future Enhancements (Optional)

- [ ] Add export format options (PostgreSQL, MySQL, SQLite)
- [ ] Include view definitions (requires storing view SQL)
- [ ] Add comments from original schema
- [ ] Export indexes and constraints
- [ ] Include table statistics
