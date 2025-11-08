# Testing Schema Grouping Feature

This guide helps you test the newly implemented Schema Grouping feature.

## Quick Start

### Option 1: Import Sample File (Recommended)

1. **Open the Application**
   - Start the dev server: `npm run dev`
   - Open http://localhost:3000

2. **Import the Sample SQL File**
   - Click the **"Import SQL"** button (bottom-left corner)
   - Drag and drop `sample-multi-schema.sql` into the dialog
   - Or click to browse and select the file
   - Click "Import Schema"

3. **Expected Result**
   - You should see tables from 3 schemas:
     - **public** (blue): users, posts, comments, categories, post_categories, user_post_count (view)
     - **auth** (green): users, sessions, refresh_tokens, audit_log, active_sessions (view)
     - **storage** (amber): buckets, objects, migrations

## Testing the Features

### 1. Schema Filter Panel (Top-Right)

**What to Test:**
- ✅ Check that SchemaFilter panel appears in top-right corner
- ✅ Should show 3 schemas: public (blue), auth (green), storage (amber)
- ✅ Each schema shows table count in parentheses

**Actions to Try:**
- Click on a schema name to hide it
  - Tables from that schema should disappear
  - Eye icon should change to EyeOff
- Click again to show it
  - Tables reappear
  - Eye icon changes back
- Click "Hide All"
  - All tables disappear
  - Canvas should be empty
- Click "Show All"
  - All tables reappear

### 2. Schema-Aware Auto-Layout

**What to Test:**
- ✅ Click the **"Auto Arrange"** button (in Helper toolbar)
- ✅ Tables should group by schema horizontally
- ✅ Each schema group should be laid out neatly
- ✅ Groups should have ~400px spacing between them
- ✅ Order: public | auth | storage (left to right)

### 3. Persistence

**What to Test:**
- ✅ Hide one or more schemas
- ✅ Refresh the page (F5)
- ✅ Hidden schemas should remain hidden
- ✅ Settings are saved to localStorage

### 4. Search with Schema Filtering

**What to Test:**
- ✅ Press `Ctrl+F` (or `Cmd+F` on Mac) to open search
- ✅ Hide the "auth" schema
- ✅ Search for "users"
  - Should only find `public.users`
  - Should NOT find `auth.users` (because auth is hidden)
- ✅ Show "auth" schema again
- ✅ Search for "users" again
  - Should now find both `public.users` and `auth.users`

## Sample Database Structure

### Public Schema (Blue)
```
users (6 columns)
  ├─→ posts (7 columns)
  │    ├─→ comments (4 columns)
  │    └─→ post_categories (2 columns)
  │             └─→ categories (3 columns)
  └─→ comments (4 columns)

Views:
- user_post_count (3 columns)
```

### Auth Schema (Green)
```
users (9 columns)
  ├─→ sessions (7 columns)
  ├─→ refresh_tokens (6 columns)
  └─→ audit_log (7 columns)

Views:
- active_sessions (6 columns)
```

### Storage Schema (Amber)
```
buckets (7 columns)
  └─→ objects (9 columns)

migrations (3 columns)
```

## Expected Visual Layout

After clicking "Auto Arrange", you should see:

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  PUBLIC SCHEMA  │   │  AUTH SCHEMA    │   │ STORAGE SCHEMA  │
│  (Blue border)  │   │  (Green border) │   │ (Amber border)  │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│  users          │   │  users          │   │  buckets        │
│  posts          │   │  sessions       │   │  objects        │
│  comments       │   │  refresh_tokens │   │  migrations     │
│  categories     │   │  audit_log      │   └─────────────────┘
│  post_categs    │   │  active_sesss   │
│  user_post_ct   │   └─────────────────┘
└─────────────────┘
    400px gap          400px gap
```

## Color Reference

| Schema     | Color  | Hex Code |
|------------|--------|----------|
| public     | Blue   | #3B82F6  |
| auth       | Green  | #10B981  |
| storage    | Amber  | #F59E0B  |
| extensions | Purple | #8B5CF6  |
| graphql    | Pink   | #EC4899  |
| realtime   | Teal   | #14B8A6  |
| vault      | Red    | #EF4444  |
| (others)   | Gray   | #6B7280  |

## Troubleshooting

### Issue: Schema Filter panel doesn't appear
**Solution:** Check that you have imported a schema with multiple schemas. If all tables are in "public" schema only, the panel might not show meaningful data.

### Issue: Tables don't group horizontally after Auto Arrange
**Solution:** Make sure you imported the multi-schema SQL file. Single-schema databases won't show horizontal grouping.

### Issue: Schema visibility doesn't persist after refresh
**Solution:** Check browser console for localStorage errors. Make sure localStorage is enabled in your browser.

### Issue: Can't see any tables after importing
**Solution:** Click "Show All" button in SchemaFilter panel. You might have accidentally hidden all schemas.

## Testing Checklist

- [ ] Import sample-multi-schema.sql file
- [ ] Verify 3 schemas appear in SchemaFilter panel
- [ ] Test hiding/showing individual schemas
- [ ] Test "Show All" and "Hide All" buttons
- [ ] Click "Auto Arrange" and verify horizontal grouping
- [ ] Test schema visibility persistence (refresh page)
- [ ] Test search with hidden schemas
- [ ] Test drag-and-drop table positioning
- [ ] Verify foreign key connections render correctly
- [ ] Check dark mode compatibility

## Advanced Testing

### Test with Your Own SQL

You can also test with your own PostgreSQL database:

```sql
-- Export from your database
pg_dump -U username -d database_name --schema-only > my-schema.sql
```

Then import `my-schema.sql` using the Import SQL button.

### Test with Supabase

If you have a Supabase project:
1. Go to SQL Editor in Supabase Dashboard
2. Copy the schema DDL statements
3. Save to a .sql file
4. Import using the Import SQL button

Supabase typically has these schemas:
- `public` - Your application tables
- `auth` - Authentication tables
- `storage` - File storage tables
- `extensions` - PostgreSQL extensions

## What's Next?

After testing Schema Grouping, the next feature is **Relationship Filtering**:
- Toggle visibility of FK connections
- Filter by relationship type (one-to-one, one-to-many, many-to-many)
- Hide/show all edges
- Filter by source/target table

---

**Need Help?** Check the main README.md or open an issue on GitHub.
