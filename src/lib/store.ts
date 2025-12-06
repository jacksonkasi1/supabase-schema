'use client';

import { create } from 'zustand';
import {
  TableState,
  Column,
  SchemaView,
  SupabaseApiKey,
  EnumTypeDefinition,
} from './types';
import { RelationshipType } from '@/types/flow';

interface AppState {
  // Modal state
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;

  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  expandedTables: Set<string>;
  toggleTableExpanded: (tableId: string) => void;
  expandTable: (tableId: string) => void;
  collapseTable: (tableId: string) => void;

  // Table state
  tables: TableState;
  setTables: (definition: any, paths: any) => void;
  updateTablesFromAI: (
    tables: TableState,
    meta?: { enumTypes?: Record<string, EnumTypeDefinition> }
  ) => void;
  updateTablePosition: (tableId: string, x: number, y: number) => void;
  updateTableName: (tableId: string, newName: string) => void;
  updateTableColor: (tableId: string, color: string) => void;
  updateTableComment: (tableId: string, comment: string) => void;
  addTable: () => string;
  addColumn: (tableId: string, column: Column) => void;
  updateColumn: (tableId: string, columnIndex: number, updates: Partial<Column>) => void;
  deleteColumn: (tableId: string, columnIndex: number) => void;
  deleteTable: (tableId: string) => void;
  reorderTables: (orderedIds: string[]) => void;
  autoArrange: () => void;

  // Layout trigger for ReactFlow
  layoutTrigger: number;
  triggerLayout: () => void;
  fitViewTrigger: number;
  triggerFitView: () => void;
  zoomInTrigger: number;
  triggerZoomIn: () => void;
  zoomOutTrigger: number;
  triggerZoomOut: () => void;

  // Search and focus
  focusTableId: string | null;
  focusTableTrigger: number;
  triggerFocusTable: (tableId: string) => void;

  // Selection and highlighting
  tableSelected: Set<Element>;
  setTableSelected: (selected: Set<Element>) => void;
  tableHighlighted: string;
  setTableHighlighted: (highlighted: string) => void;
  connectorHighlighted: string[];
  setConnectorHighlighted: (highlighted: string[]) => void;

  // Schema view (zoom/pan)
  schemaView: SchemaView;
  setSchemaView: (view: SchemaView) => void;
  updateSchemaViewTranslate: (x: number, y: number) => void;
  updateSchemaViewScale: (scale: number) => void;

  // Supabase API key
  supabaseApiKey: SupabaseApiKey;
  setSupabaseApiKey: (apiKey: SupabaseApiKey) => void;

  // Edge relationships
  edgeRelationships: Record<string, RelationshipType>;
  setEdgeRelationship: (edgeId: string, type: RelationshipType) => void;
  getEdgeRelationship: (edgeId: string) => RelationshipType;

  // Schema grouping
  visibleSchemas: Set<string>;
  collapsedSchemas: Set<string>;
  toggleSchemaVisibility: (schema: string) => void;
  toggleSchemaCollapse: (schema: string) => void;
  showAllSchemas: () => void;
  hideAllSchemas: () => void;
  getVisibleSchemas: () => string[];

  // Initialize from localStorage
  initializeFromLocalStorage: () => void;

  // Save to localStorage
  saveToLocalStorage: () => void;

  // Clear localStorage cache
  clearCache: () => void;

  // Add new tables (used for copy/paste, AI updates, etc.)
  addTables: (tables: TableState) => void;

  // Enum types
  enumTypes: Record<string, EnumTypeDefinition>;
  setEnumTypes: (types: Record<string, EnumTypeDefinition>) => void;
}

const checkView = (title: string, paths: any) => {
  if (paths[`/${title}`] && Object.keys(paths[`/${title}`]).length === 1) {
    return true;
  }
  return false;
};

const sanitizeTables = (tables: TableState) => {
  const cleaned: TableState = {};
  let removedTables = 0;
  let removedColumns = 0;

  Object.entries(tables).forEach(([key, table]) => {
    if (!key || !key.trim()) {
      removedTables++;
      return;
    }

    const columns = Array.isArray(table?.columns) ? table.columns : [];
    const validColumns = columns.filter(
      (column) => column && typeof column.title === 'string' && column.title.trim()
    );

    if (validColumns.length === 0) {
      removedTables++;
      removedColumns += columns.length;
      return;
    }

    cleaned[key] = {
      ...table,
      title: table.title || key,
      columns: validColumns,
    };
  });

  return {
    tables: cleaned,
    removedTables,
    removedColumns,
  };
};

// Debounced localStorage save to prevent excessive writes
let saveTimeoutId: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 500; // Wait 500ms before saving
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

function debouncedSave(saveFn: () => void) {
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }
  saveTimeoutId = setTimeout(() => {
    saveFn();
    saveTimeoutId = null;
  }, SAVE_DEBOUNCE_MS);
}

// Internal function to perform the actual save (used by both debounced and immediate saves)
// Note: get() will be set by the store initialization
let getStateFn: (() => AppState) | null = null;

function performSave() {
  if (typeof window === 'undefined' || !getStateFn) return;
  
  try {
    const state = getStateFn();

    // Check current storage size before saving
    const currentSize = getStorageSize();
    if (currentSize > MAX_STORAGE_SIZE) {
      console.warn(`localStorage size (${(currentSize / 1024 / 1024).toFixed(2)}MB) exceeds limit. Clearing old data...`);
      // Clear only table data, keep user preferences
      localStorage.removeItem('table-list');
      localStorage.removeItem('edge-relationships');
      localStorage.removeItem('enum-types');
    }

    // Store data with size-optimized JSON (no extra whitespace)
    const tablesJson = JSON.stringify(state.tables);
    const edgeRelationshipsJson = JSON.stringify(state.edgeRelationships);
    const visibleSchemasJson = JSON.stringify(Array.from(state.visibleSchemas));
    const collapsedSchemasJson = JSON.stringify(Array.from(state.collapsedSchemas));
    const enumTypesJson = JSON.stringify(state.enumTypes);

    // Check individual item sizes before saving
    const totalNewSize =
      tablesJson.length +
      edgeRelationshipsJson.length +
      visibleSchemasJson.length +
      collapsedSchemasJson.length +
      enumTypesJson.length;

    if (totalNewSize > MAX_STORAGE_SIZE) {
      console.error(`Cannot save: Data size (${(totalNewSize / 1024 / 1024).toFixed(2)}MB) exceeds ${MAX_STORAGE_SIZE / 1024 / 1024}MB limit`);
      // Show warning to user
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('storage:exceeded', {
          detail: { size: totalNewSize, limit: MAX_STORAGE_SIZE }
        }));
      }
      return;
    }

    localStorage.setItem('table-list', tablesJson);
    localStorage.setItem('edge-relationships', edgeRelationshipsJson);
    localStorage.setItem('visible-schemas', visibleSchemasJson);
    localStorage.setItem('collapsed-schemas', collapsedSchemasJson);
    localStorage.setItem('enum-types', enumTypesJson);
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Clearing cache...');
      if (getStateFn) {
        getStateFn().clearCache();
      }
    } else {
      console.error('Error saving to localStorage:', error);
    }
  }
}

// Flush pending saves immediately (for app close/unload)
function flushPendingSave() {
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
    saveTimeoutId = null;
    // Execute the pending save immediately
    performSave();
  }
}

// Set up event listeners to flush on app close/unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingSave);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingSave();
    }
  });
}

function getStorageSize(): number {
  if (typeof window === 'undefined') return 0;
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

export const useStore = create<AppState>((set, get) => {
  // Set the get function for performSave to use
  getStateFn = get;
  
  return {
  // Initial state
  isModalOpen: false,
  sidebarOpen: true,
  expandedTables: new Set<string>(),
  tables: {},
  enumTypes: {},
  tableSelected: new Set<Element>(),
  tableHighlighted: '',
  connectorHighlighted: [],
  schemaView: {
    translate: { x: 0, y: 0 },
    scale: 1,
  },
  supabaseApiKey: {
    url: '',
    anon: '',
    last_url: '',
  },
  edgeRelationships: {},
  visibleSchemas: new Set<string>(),
  collapsedSchemas: new Set<string>(),
  layoutTrigger: 0,
  fitViewTrigger: 0,
  zoomInTrigger: 0,
  zoomOutTrigger: 0,
  focusTableId: null,
  focusTableTrigger: 0,

  // Actions
  setIsModalOpen: (open) => set({ isModalOpen: open }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleTableExpanded: (tableId) => {
    set((state) => {
      const newExpanded = new Set(state.expandedTables);
      if (newExpanded.has(tableId)) {
        newExpanded.delete(tableId);
      } else {
        newExpanded.add(tableId);
      }
      return { expandedTables: newExpanded };
    });
  },

  expandTable: (tableId) => {
    set((state) => ({
      expandedTables: new Set(state.expandedTables).add(tableId),
    }));
  },

  collapseTable: (tableId) => {
    set((state) => {
      const newExpanded = new Set(state.expandedTables);
      newExpanded.delete(tableId);
      return { expandedTables: newExpanded };
    });
  },

  setTables: (definition: any, paths: any) => {
    const tableGroup: TableState = {};
    const currentTables = get().tables;

    for (const [rawKey, value] of Object.entries(definition)) {
      const key = typeof rawKey === 'string' ? rawKey.trim() : '';
      const tableValue = value as any;
      const properties = tableValue?.properties;

      if (
        !key ||
        !properties ||
        typeof properties !== 'object' ||
        Object.keys(properties).length === 0
      ) {
        continue;
      }

      const colGroup: Column[] = Object.keys(properties).map((colKey: string) => {
        const colVal = properties[colKey];
        return {
          title: colKey,
          format: colVal.format?.split(' ')[0] || '',
          type: colVal.type,
          default: colVal.default || undefined,
          required: tableValue.required?.includes(colKey) || false,
          pk: colVal.description?.includes('<pk/>') || false,
          fk: colVal.description ? colVal.description.split('`')[1] : undefined,
          enumTypeName: colVal.enumTypeName,
          enumValues: colVal.enumValues,
        };
      });

      const keyParts = key.split('.');
      const schema = keyParts.length > 1 ? keyParts[0] : undefined;

      tableGroup[key] = {
        title: key,
        is_view: checkView(key, paths),
        columns: colGroup,
        position: currentTables[key]
          ? currentTables[key].position
          : { x: 0, y: 0 },
        schema,
      };
    }

    const { tables: sanitizedTables, removedTables } = sanitizeTables(tableGroup);
    set({ tables: sanitizedTables });
    if (removedTables > 0) {
      console.log(
        `[setTables] Sanitized ${removedTables} invalid table definition(s)`
      );
    }
    
    // Ensure all new schemas are visible when importing
    const sanitizedSchemas = new Set(
      Object.values(sanitizedTables)
        .map((table) => table.schema)
        .filter(Boolean) as string[]
    );
    const currentVisibleSchemas = get().visibleSchemas;
    if (currentVisibleSchemas.size === 0) {
      // If no schemas are visible, show all new schemas
      set({ visibleSchemas: sanitizedSchemas });
    } else {
      // Add new schemas to visible set if they don't exist
      const updatedVisibleSchemas = new Set(currentVisibleSchemas);
      sanitizedSchemas.forEach((schema) => updatedVisibleSchemas.add(schema));
      set({ visibleSchemas: updatedVisibleSchemas });
    }
    
    get().saveToLocalStorage();
  },

  updateTablesFromAI: (updatedTables, meta) => {
    set((state) => {
      const nextTables: TableState = {};
      const discoveredSchemas = new Set<string>();

      for (const [tableId, tableValue] of Object.entries(updatedTables)) {
        const existing = state.tables[tableId];
        const columns = tableValue.columns ?? [];

        if (tableValue.schema) {
          discoveredSchemas.add(tableValue.schema);
        }

        nextTables[tableId] = {
          ...tableValue,
          columns,
          position:
            existing?.position ??
            tableValue.position ?? { x: 0, y: 0 },
        };
      }

      const mergedVisibleSchemas = new Set(state.visibleSchemas);
      discoveredSchemas.forEach((schema) => mergedVisibleSchemas.add(schema));

      const { tables: sanitizedTables, removedTables } = sanitizeTables(nextTables);

      if (removedTables > 0) {
        console.log(
          `[updateTablesFromAI] Sanitized ${removedTables} invalid table(s) from AI response`
        );
      }

      const updates: Partial<AppState> = {
        tables: sanitizedTables,
        visibleSchemas: mergedVisibleSchemas,
      };

      if (meta?.enumTypes) {
        updates.enumTypes = meta.enumTypes;
      }

      return updates;
    });

    get().saveToLocalStorage();
  },

  updateTablePosition: (tableId, x, y) => {
    set((state) => {
      const existing = state.tables[tableId];
      if (!existing) {
        return state;
      }

      return {
        tables: {
          ...state.tables,
          [tableId]: {
            ...existing,
            position: { x, y },
          },
        },
      };
    });
    get().saveToLocalStorage();
  },

  updateTableName: (tableId, newName) => {
    const currentTables = get().tables;
    const table = currentTables[tableId];
    if (!table) return;

    const updatedTables = { ...currentTables };
    delete updatedTables[tableId];
    updatedTables[newName] = {
      ...table,
      title: newName,
    };

    // Update expandedTables if the old table was expanded
    const wasExpanded = get().expandedTables.has(tableId);
    if (wasExpanded) {
      const newExpanded = new Set(get().expandedTables);
      newExpanded.delete(tableId);
      newExpanded.add(newName);
      set({ tables: updatedTables, expandedTables: newExpanded });
    } else {
      set({ tables: updatedTables });
    }
    get().saveToLocalStorage();
  },

  updateTableColor: (tableId, color) => {
    set((state) => {
      const existing = state.tables[tableId];
      if (!existing) return state;

      return {
        tables: {
          ...state.tables,
          [tableId]: {
            ...existing,
            color,
          },
        },
      };
    });
    get().saveToLocalStorage();
  },

  updateTableComment: (tableId, comment) => {
    set((state) => {
      const existing = state.tables[tableId];
      if (!existing) return state;

      return {
        tables: {
          ...state.tables,
          [tableId]: {
            ...existing,
            comment,
          },
        },
      };
    });
    get().saveToLocalStorage();
  },

  addTable: () => {
    const { tables, addTables, triggerFocusTable } = get();

    const baseName = 'new_table';
    let counter = 1;
    let tableName = baseName;

    while (tables[tableName]) {
      tableName = `${baseName}_${counter}`;
      counter += 1;
    }

    const newTable: TableState = {
      [tableName]: {
        title: tableName,
        columns: [
          {
            title: 'id',
            format: 'uuid',
            type: 'string',
            required: true,
            pk: true,
          },
        ],
        position: { x: 0, y: 0 },
      },
    };

    addTables(newTable);

    set((state) => ({
      expandedTables: new Set(state.expandedTables).add(tableName),
    }));

    triggerFocusTable(tableName);

    return tableName;
  },

  addColumn: (tableId, column) => {
    set((state) => {
      const existing = state.tables[tableId];
      if (!existing) return state;

      return {
        tables: {
          ...state.tables,
          [tableId]: {
            ...existing,
            columns: [...(existing.columns || []), column],
          },
        },
      };
    });
    get().saveToLocalStorage();
  },

  updateColumn: (tableId, columnIndex, updates) => {
    set((state) => {
      const existing = state.tables[tableId];
      if (!existing || !existing.columns) return state;

      const newColumns = [...existing.columns];
      newColumns[columnIndex] = {
        ...newColumns[columnIndex],
        ...updates,
      };

      return {
        tables: {
          ...state.tables,
          [tableId]: {
            ...existing,
            columns: newColumns,
          },
        },
      };
    });
    get().saveToLocalStorage();
  },

  deleteColumn: (tableId, columnIndex) => {
    set((state) => {
      const existing = state.tables[tableId];
      if (!existing || !existing.columns) return state;

      const newColumns = existing.columns.filter((_, idx) => idx !== columnIndex);

      return {
        tables: {
          ...state.tables,
          [tableId]: {
            ...existing,
            columns: newColumns,
          },
        },
      };
    });
    get().saveToLocalStorage();
  },

  deleteTable: (tableId) => {
    set((state) => {
      const newTables = { ...state.tables };
      delete newTables[tableId];

      const newExpanded = new Set(state.expandedTables);
      newExpanded.delete(tableId);

      return {
        tables: newTables,
        expandedTables: newExpanded,
      };
    });
    get().saveToLocalStorage();
  },

  reorderTables: (orderedIds) => {
    set((state) => {
      const newTables: TableState = {};
      // Rebuild tables object in the new order
      orderedIds.forEach((id) => {
        if (state.tables[id]) {
          newTables[id] = state.tables[id];
        }
      });
      // Add any tables that weren't in orderedIds (shouldn't happen, but safe)
      Object.keys(state.tables).forEach((id) => {
        if (!newTables[id]) {
          newTables[id] = state.tables[id];
        }
      });
      return { tables: newTables };
    });
    get().saveToLocalStorage();
  },

  autoArrange: () => {
    // Trigger layout in ReactFlow
    set((state) => ({ layoutTrigger: state.layoutTrigger + 1 }));
  },

  triggerLayout: () => {
    set((state) => ({ layoutTrigger: state.layoutTrigger + 1 }));
  },

  triggerFitView: () => {
    set((state) => ({ fitViewTrigger: state.fitViewTrigger + 1 }));
  },

  triggerZoomIn: () => {
    set((state) => ({ zoomInTrigger: state.zoomInTrigger + 1 }));
  },

  triggerZoomOut: () => {
    set((state) => ({ zoomOutTrigger: state.zoomOutTrigger + 1 }));
  },

  triggerFocusTable: (tableId) => {
    set((state) => ({
      focusTableId: tableId,
      focusTableTrigger: state.focusTableTrigger + 1,
      // Don't set tableHighlighted here - it interferes with drag operations
      // SearchBar will handle highlighting separately if needed
    }));
  },

  setTableSelected: (selected) => set({ tableSelected: selected }),
  setTableHighlighted: (highlighted) => set({ tableHighlighted: highlighted }),
  setConnectorHighlighted: (highlighted) => set({ connectorHighlighted: highlighted }),

  setSchemaView: (view) => {
    set({ schemaView: view });
    if (typeof window !== 'undefined') {
      localStorage.setItem('view', JSON.stringify(view));
    }
  },

  updateSchemaViewTranslate: (x, y) => {
    const newView = {
      ...get().schemaView,
      translate: { x, y },
    };
    get().setSchemaView(newView);
  },

  updateSchemaViewScale: (scale) => {
    const newView = {
      ...get().schemaView,
      scale,
    };
    get().setSchemaView(newView);
  },

  setSupabaseApiKey: (apiKey) => {
    set({ supabaseApiKey: apiKey });
    if (typeof window !== 'undefined') {
      localStorage.setItem('supabase-apikey', JSON.stringify(apiKey));
    }
  },

  setEdgeRelationship: (edgeId, type) => {
    set((state) => ({
      edgeRelationships: {
        ...state.edgeRelationships,
        [edgeId]: type,
      },
    }));
    get().saveToLocalStorage();
  },

  getEdgeRelationship: (edgeId) => {
    return get().edgeRelationships[edgeId] || 'one-to-many';
  },

  // Schema grouping actions
  toggleSchemaVisibility: (schema) => {
    set((state) => {
      const newVisibleSchemas = new Set(state.visibleSchemas);
      if (newVisibleSchemas.has(schema)) {
        newVisibleSchemas.delete(schema);
      } else {
        newVisibleSchemas.add(schema);
      }
      return { visibleSchemas: newVisibleSchemas };
    });
    get().saveToLocalStorage();
  },

  toggleSchemaCollapse: (schema) => {
    set((state) => {
      const newCollapsedSchemas = new Set(state.collapsedSchemas);
      if (newCollapsedSchemas.has(schema)) {
        newCollapsedSchemas.delete(schema);
      } else {
        newCollapsedSchemas.add(schema);
      }
      return { collapsedSchemas: newCollapsedSchemas };
    });
    get().saveToLocalStorage();
  },

  showAllSchemas: () => {
    const { tables } = get();
    const allSchemas = new Set<string>();
    Object.values(tables).forEach((table) => {
      if (table.schema) {
        allSchemas.add(table.schema);
      }
    });
    set({ visibleSchemas: allSchemas });
    get().saveToLocalStorage();
  },

  hideAllSchemas: () => {
    set({ visibleSchemas: new Set<string>() });
    get().saveToLocalStorage();
  },

  getVisibleSchemas: () => {
    return Array.from(get().visibleSchemas);
  },

  initializeFromLocalStorage: () => {
    if (typeof window === 'undefined') return;

    try {
      const tablesData = localStorage.getItem('table-list');
      if (tablesData) {
        const loadedTables = JSON.parse(tablesData);
        const { tables: cleanedTables, removedTables } = sanitizeTables(loadedTables);

        if (removedTables > 0) {
          console.log(
            `[initializeFromLocalStorage] Cleaned up ${removedTables} dummy table(s)`
          );
          localStorage.setItem('table-list', JSON.stringify(cleanedTables));
        }

        set({ tables: cleanedTables });
      }

      const viewData = localStorage.getItem('view');
      if (viewData) {
        set({ schemaView: JSON.parse(viewData) });
      }

      const apiKeyData = localStorage.getItem('supabase-apikey');
      if (apiKeyData) {
        set({ supabaseApiKey: JSON.parse(apiKeyData) });
      }

      const edgeRelationshipsData = localStorage.getItem('edge-relationships');
      if (edgeRelationshipsData) {
        set({ edgeRelationships: JSON.parse(edgeRelationshipsData) });
      }

      const visibleSchemasData = localStorage.getItem('visible-schemas');
      if (visibleSchemasData) {
        set({ visibleSchemas: new Set(JSON.parse(visibleSchemasData)) });
      } else {
        // Default: show all schemas
        get().showAllSchemas();
      }

      const collapsedSchemasData = localStorage.getItem('collapsed-schemas');
      if (collapsedSchemasData) {
        set({ collapsedSchemas: new Set(JSON.parse(collapsedSchemasData)) });
      }

      const enumTypesData = localStorage.getItem('enum-types');
      if (enumTypesData) {
        try {
          set({ enumTypes: JSON.parse(enumTypesData) });
        } catch (error) {
          console.error('Error parsing enum types from localStorage', error);
        }
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  },

  saveToLocalStorage: () => {
    // Debounce the save operation to prevent excessive writes
    debouncedSave(performSave);
  },

  addTables: (tablesToAdd: TableState) => {
    set((state) => {
      const mergedTables = {
        ...state.tables,
        ...tablesToAdd,
      };

      const { tables: sanitizedTables } = sanitizeTables(mergedTables);
      const updatedVisibleSchemas = new Set(state.visibleSchemas);

      Object.values(tablesToAdd).forEach((table) => {
        if (table.schema) {
          updatedVisibleSchemas.add(table.schema);
        }
      });

      return {
        tables: sanitizedTables,
        visibleSchemas: updatedVisibleSchemas,
      };
    });

    get().saveToLocalStorage();
  },

  setEnumTypes: (types) => {
    set({ enumTypes: types });
    get().saveToLocalStorage();
  },

  clearCache: () => {
    if (typeof window === 'undefined') return;

    try {
      // Clear all schema-related data from localStorage
      localStorage.removeItem('table-list');
      localStorage.removeItem('edge-relationships');
      localStorage.removeItem('visible-schemas');
      localStorage.removeItem('collapsed-schemas');
      localStorage.removeItem('enum-types');

      // Clear timeout if pending
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
        saveTimeoutId = null;
      }

      console.log('Cache cleared successfully');

      // Dispatch event for UI feedback
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('storage:cleared'));
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },
  };
});
