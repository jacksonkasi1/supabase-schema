# Relationship Management Fixes

## Summary

Fixed 2 critical issues with table relationship management:

1. ✅ **Deleted relationships no longer auto-restore** when moving tables
2. ✅ **Drag & drop connections now persist** to the database
3. ✅ **FK dropdown added** to column editor for creating relationships without drag & drop

---

## Issue #1: Deleted Relationships Auto-Restore

### Problem

When users deleted a relationship (edge) and then moved a table, the relationship would reappear. This happened because:

- Edges are regenerated from table FK metadata (`tablesToEdges`) on every `tables` state change
- Position changes triggered this regeneration
- The FK data was still in the column, so the edge was recreated

### Solution

When deleting an edge, we now **remove the FK from the source column** in the store. This persists the deletion so `tablesToEdges` won't recreate the edge.

**File**: `src/components/flow/FlowCanvas.tsx`

```typescript
// Helper to remove FK from source column when deleting an edge
const removeFkFromEdge = useCallback(
  (edgeId: string) => {
    // Edge ID format: "sourceTable.sourceColumn-targetTable.targetColumn"
    const edgeParts = edgeId.split('-');
    if (edgeParts.length === 2) {
      const [sourceInfo] = edgeParts;
      const sourceParts = sourceInfo.split('.');
      if (sourceParts.length >= 2) {
        const sourceColumn = sourceParts[sourceParts.length - 1];
        const sourceTable = sourceParts.slice(0, -1).join('.');

        const table = tables[sourceTable];
        if (table?.columns) {
          const columnIndex = table.columns.findIndex(
            (col) => col.title === sourceColumn,
          );
          if (columnIndex >= 0) {
            updateColumn(sourceTable, columnIndex, { fk: undefined });
          }
        }
      }
    }
  },
  [tables, updateColumn],
);

// Used in both delete handlers:
const handleEdgeDelete = useCallback(() => {
  if (selectedEdge) {
    removeFkFromEdge(selectedEdge.id);  // <-- Persist deletion
    setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
    setSelectedEdge(null);
    toast.success('Relationship deleted');
  }
}, [selectedEdge, setEdges, removeFkFromEdge]);
```

---

## Issue #2: Drag & Drop Connections Not Persisting

### Problem

When users created relationships by dragging between table columns:
- The connection would appear visually
- But it wasn't saved to the store
- On next edge regeneration (e.g., moving a table), the connection disappeared

### Solution

Updated `onConnect` to **persist the FK relationship** to the source column in the store.

**File**: `src/components/flow/FlowCanvas.tsx`

```typescript
const onConnect = useCallback(
  (params: Connection) => {
    // Helper to parse handle ids: "<table>_<col>_<index>"
    const parseHandle = (handleId?: string | null) => {
      if (!handleId) return null;
      const parts = handleId.split('_');
      const idxPart = parts.pop();
      const index = idxPart ? Number(idxPart) : NaN;
      const col = parts.pop() ?? '';
      const table = parts.join('_');
      return { table, col, index };
    };

    try {
      const src = parseHandle(params.sourceHandle);
      const tgt = parseHandle(params.targetHandle);

      if (src && tgt && !Number.isNaN(src.index) && !Number.isNaN(tgt.index)) {
        // Persist FK on the source column
        const fkValue = `${tgt.table}.${tgt.col}`;
        updateColumn(src.table, src.index, { fk: fkValue });

        toast.success('Relationship created', {
          description: `${src.table}.${src.col} → ${tgt.table}.${tgt.col}`,
        });
      }
    } catch (err) {
      console.error('Failed to persist FK on connect:', err);
    }

    // Add edge for immediate visual feedback
    setEdges((eds) => addEdge(params, eds));
  },
  [setEdges, updateColumn],
);
```

---

## Bonus: FK Dropdown in Column Editor

Added a dropdown menu to the column editor for creating/managing relationships without drag & drop.

**File**: `src/components/schema/ColumnRow.tsx`

### Features

- **FK Link Icon** (🔗): Shows on all columns, visible on hover (always visible if FK exists)
- **Searchable Dropdown**: Lists all available `table.column` combinations
- **Remove Option**: Clear FK reference with one click
- **Visual Feedback**: Icon turns emerald green when FK is set

### Usage

1. Open a table in the sidebar
2. Hover over any column row
3. Click the 🔗 link icon
4. Search and select target `table.column`
5. Edge appears on canvas immediately

To remove: Click the icon again → Select "Remove FK reference"

---

## Files Modified

1. **`src/components/flow/FlowCanvas.tsx`**
   - Added `updateColumn` to store destructuring
   - Added `removeFkFromEdge` helper function
   - Updated `onConnect` to persist FK relationships
   - Updated `handleEdgeDelete` to remove FK on delete
   - Updated `handleEdgeDeleteFromMenu` to remove FK on delete
   - Added success toast notifications

2. **`src/components/schema/ColumnRow.tsx`**
   - Added FK relationship dropdown selector
   - Added FK link icon with visual state
   - Added search/filter for available FK targets
   - Added remove FK option

---

## Testing

### Test Case 1: Delete Relationship Persists

1. Have two tables with a relationship (edge visible)
2. Click on the edge to select it
3. Delete the edge (click delete button or right-click → Delete)
4. ✅ Edge disappears
5. ✅ Toast shows "Relationship deleted"
6. Move any table (drag to new position)
7. ✅ Deleted edge does NOT reappear
8. Refresh the page
9. ✅ Relationship still deleted

### Test Case 2: Create Relationship via Drag & Drop

1. Drag from a green FK handle to a target column
2. ✅ Edge appears immediately
3. ✅ Toast shows "Relationship created"
4. Move the source table
5. ✅ Edge persists (not deleted)
6. Refresh the page
7. ✅ Relationship still exists

### Test Case 3: Create Relationship via Dropdown

1. Open column editor in sidebar
2. Hover over a column → Click 🔗 icon
3. Search for target `table.column`
4. Select target
5. ✅ Edge appears on canvas
6. ✅ Icon turns emerald green
7. Move tables
8. ✅ Relationship persists

### Test Case 4: Remove Relationship via Dropdown

1. Click 🔗 icon on a column with FK
2. Select "Remove FK reference"
3. ✅ Edge disappears from canvas
4. ✅ Icon returns to gray (visible on hover only)
5. Move tables
6. ✅ Edge does NOT reappear

---

## Technical Notes

### Edge ID Format

```
{sourceTable}.{sourceColumn}-{targetTable}.{targetColumn}
```

Example: `orders.user_id-users.id`

### FK Value Format

Stored in column as: `{targetTable}.{targetColumn}`

Example: `users.id`

### Handle ID Format

```
{tableName}_{columnName}_{index}
```

Example: `orders_user_id_1`

---

## Why This Approach Works

The key insight is that **relationships are stored in two places**:

1. **Visual edges** in ReactFlow state (temporary, rebuilt frequently)
2. **FK metadata** in table columns in the store (persistent, saved to localStorage)

Previously:
- Creating edges only updated visual state
- Deleting edges only removed from visual state
- Edge regeneration from FK metadata would restore/overwrite

Now:
- Creating edges → Also adds FK to column
- Deleting edges → Also removes FK from column
- Edge regeneration respects the actual FK state

This ensures visual edges always match the underlying data model.