'use client';

import { create } from 'zustand';
import { TableState, Column, SchemaView, SupabaseApiKey } from './types';
import { RelationshipType } from '@/types/flow';

interface AppState {
  // Modal state
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;

  // Table state
  tables: TableState;
  setTables: (definition: any, paths: any) => void;
  updateTablePosition: (tableId: string, x: number, y: number) => void;
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
}

const checkView = (title: string, paths: any) => {
  if (paths[`/${title}`] && Object.keys(paths[`/${title}`]).length === 1) {
    return true;
  }
  return false;
};

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  isModalOpen: false,
  tables: {},
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

  setTables: (definition: any, paths: any) => {
    const tableGroup: TableState = {};
    const currentTables = get().tables;

    for (const [key, value] of Object.entries(definition)) {
      const colGroup: Column[] = [];
      const tableValue = value as any;

      Object.keys(tableValue.properties).forEach((colKey: string) => {
        const colVal = tableValue.properties[colKey];
        const col: Column = {
          title: colKey,
          format: colVal.format?.split(' ')[0] || '',
          type: colVal.type,
          default: colVal.default || undefined,
          required: tableValue.required?.includes(colKey) || false,
          pk: colVal.description?.includes('<pk/>') || false,
          fk: colVal.description ? colVal.description.split('`')[1] : undefined,
        };
        colGroup.push(col);
      });

      // Preserve existing position if table already exists
      tableGroup[key] = {
        title: key,
        is_view: checkView(key, paths),
        columns: colGroup,
        position: currentTables[key]
          ? currentTables[key].position
          : { x: 0, y: 0 },
      };
    }

    set({ tables: tableGroup });
    get().saveToLocalStorage();
  },

  updateTablePosition: (tableId, x, y) => {
    set((state) => ({
      tables: {
        ...state.tables,
        [tableId]: {
          ...state.tables[tableId],
          position: { x, y },
        },
      },
    }));
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
        set({ tables: JSON.parse(tablesData) });
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
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  },

  saveToLocalStorage: () => {
    if (typeof window === 'undefined') return;

    try {
      const state = get();
      localStorage.setItem('table-list', JSON.stringify(state.tables));
      localStorage.setItem('edge-relationships', JSON.stringify(state.edgeRelationships));
      localStorage.setItem('visible-schemas', JSON.stringify(Array.from(state.visibleSchemas)));
      localStorage.setItem('collapsed-schemas', JSON.stringify(Array.from(state.collapsedSchemas)));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },
}));
