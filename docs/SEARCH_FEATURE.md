# Search and Filter Tables - User Guide

## Overview

The Search and Filter feature helps you quickly find tables, views, and columns in large database schemas. With powerful filtering options and keyboard shortcuts, navigating complex databases has never been easier.

## How to Use

### Opening Search

**Three ways to open:**
1. Click the "Search tables..." button at the top center of the screen
2. Press `Ctrl+F` (Windows/Linux) or `⌘F` (Mac)
3. The search bar is always accessible regardless of zoom level

### Searching

1. **Type your query** - Start typing table name, view name, or column name
2. **Results appear instantly** - No need to press Enter
3. **Navigate results** - Use arrow keys (↑↓) to navigate
4. **Select** - Press Enter or click to jump to the table

### Jump-to Functionality

When you select a result:
- ✅ Canvas automatically zooms to the table
- ✅ Table is centered on screen
- ✅ Table is highlighted for easy identification
- ✅ Smooth animation provides context

## Features

### 1. Search Types

**Table Search** (default)
```
Search: users
Results:
  → users (table)
  → user_profiles (table)
  → tbl_users (table)
```

**Column Search**
```
Search: email
Results:
  → users - Column: email
  → admins - Column: email
  → customers - Column: email_verified
```

**View Search**
```
Search: stats
Results:
  → user_stats (view)
  → order_stats (view)
```

### 2. Filter Options

Click the filter button (funnel icon) to access:

- **All** - Search everything (default)
- **Tables Only** - Only show table matches
- **Views Only** - Only show view matches
- **Columns Only** - Search within column names

### 3. Recent Searches

The search bar remembers your last 10 searches:
- Shown when search field is empty
- Click any recent search to reuse it
- Clear all with "Clear" button
- Persisted across sessions (localStorage)

### 4. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + F` | Open search |
| `↑` | Navigate up |
| `↓` | Navigate down |
| `Enter` | Jump to selected result |
| `Esc` | Close search |

### 5. Result Display

Each result shows:
- **Icon** - Blue table icon or purple view icon
- **Table Name** - Primary identifier
- **Column Name** - If match is in column (shown below)
- **Badge** - Match type (table/view/column)
- **Count** - Total results shown in footer

## Use Cases

### Find a Specific Table

**Scenario:** You know there's a "customers" table but can't find it in the diagram.

**Steps:**
1. Press `Ctrl+F`
2. Type "customers"
3. Press Enter on the first result
4. Canvas zooms to the customers table

### Find All Tables with an Email Column

**Scenario:** You need to see which tables store email addresses.

**Steps:**
1. Press `Ctrl+F`
2. Click filter → Select "Columns Only"
3. Type "email"
4. Browse through all tables that have email-related columns

### Navigate Between Related Tables

**Scenario:** Following foreign key relationships.

**Steps:**
1. Search for "orders" → Jump to orders table
2. See it references "customers" → Search "customers"
3. Jump back and forth as needed

### Find All Views

**Scenario:** You want to see all database views in your schema.

**Steps:**
1. Press `Ctrl+F`
2. Click filter → Select "Views Only"
3. Leave search empty or type partial name
4. All views are listed

## Tips and Tricks

### Exact Match Priority

Search results are sorted intelligently:
- Exact matches appear first
- Partial matches follow
- Alphabetical order within each group

Example: Searching "user" shows:
1. `user` (exact match)
2. `users` (partial match)
3. `user_profiles` (partial match)

### Case-Insensitive

Search works regardless of case:
- "users" = "Users" = "USERS" = "UsErS"

### Partial Matching

You don't need to type the full name:
- "cust" will find "customers", "customer_orders", "tbl_customers"
- "order" will find "orders", "order_items", "customer_orders"

### Clear Recent Searches

Click "Clear" button to remove all recent searches from history.

### Navigate While Viewing Results

Keep the search open to quickly jump between multiple tables:
1. Search for "user"
2. Click "users" → Jumps to users table
3. Search still remembers your query
4. Click "user_profiles" → Jumps to user_profiles

## Examples

### Example 1: Finding Foreign Key Relationships

**Goal:** Find all tables that reference the "users" table.

**Steps:**
1. Press `Ctrl+F`
2. Filter: "Columns Only"
3. Search: "user_id"
4. Results show all tables with user_id columns
5. Click each to see the relationship

### Example 2: Database Schema Exploration

**Goal:** Get familiar with a new database.

**Steps:**
1. Press `Ctrl+F`
2. Filter: "Tables Only"
3. Leave search empty - shows all tables
4. Navigate with arrow keys
5. Press Enter on each to explore

### Example 3: Quick Navigation

**Goal:** Jump between specific tables while documenting.

**Steps:**
1. Search "customers" → Document
2. Search "orders" → Document relationships
3. Search "products" → Document structure
4. Use recent searches to jump back

## Technical Details

### Performance

- **Instant search** - Results appear as you type
- **No server calls** - All search happens client-side
- **Optimized** - Handles schemas with 100+ tables smoothly
- **Cached** - Recent searches stored efficiently

### Storage

- **Recent searches** - Stored in localStorage
- **Limit** - Maximum 10 recent searches
- **Persistence** - Survives page refresh
- **Privacy** - Never sent to server

### Search Algorithm

```typescript
1. Convert query to lowercase
2. For each table:
   a. Check table name match
   b. Check each column name match
3. Apply filters (tables/views/columns)
4. Sort results (exact matches first)
5. Return ordered results
```

## Accessibility

- ✅ **Keyboard navigation** - Full control without mouse
- ✅ **Screen reader friendly** - Proper ARIA labels
- ✅ **Focus management** - Clear visual focus indicators
- ✅ **Escape handling** - Easy to close
- ✅ **Responsive** - Works on all screen sizes

## Troubleshooting

### Search not opening with Ctrl+F

**Problem:** Browser intercepts the shortcut.

**Solution:** Click the "Search tables..." button instead.

### No results found

**Possible causes:**
- Typo in search query
- Wrong filter selected (e.g., "Views Only" but searching for table)
- No tables loaded yet (import or connect to database first)

**Fix:**
- Check spelling
- Try "All" filter
- Verify database is loaded

### Jump-to not working

**Problem:** Click on result but nothing happens.

**Possible causes:**
- Table not yet rendered
- Canvas in middle of layout operation

**Fix:**
- Wait a moment and try again
- Use "Fit View" button to reset canvas
- Refresh page if problem persists

### Recent searches not persisting

**Problem:** Recent searches disappear after page refresh.

**Cause:** Browser localStorage disabled or full.

**Fix:**
- Enable localStorage in browser settings
- Clear browser cache/storage
- Try incognito/private mode

## Best Practices

1. **Use filters** - Narrow down results for faster navigation
2. **Recent searches** - Save time on repeated queries
3. **Keyboard shortcuts** - Faster than clicking
4. **Keep it open** - Navigate multiple tables quickly
5. **Descriptive searches** - Use specific terms when possible

## Future Enhancements

Planned features for future releases:
- [ ] Regex search support
- [ ] Search in table descriptions/comments
- [ ] Save/name favorite searches
- [ ] Search history analytics
- [ ] Custom search shortcuts
- [ ] Search within specific schema groups
- [ ] Export search results

## Feedback

Found a bug or have a feature request?
- Submit an issue on GitHub
- Include search query that caused the problem
- Describe expected vs actual behavior
