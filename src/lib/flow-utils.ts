import { Table, TableState } from './types';
import { FlowNode, FlowEdge } from '@/types/flow';
import { MarkerType } from '@xyflow/react';

/**
 * Convert table state to ReactFlow nodes
 */
export function tablesToNodes(tables: TableState): FlowNode[] {
  return Object.values(tables).map((table) => {
    const nodeType = table.is_view ? 'view' : 'table';

    return {
      id: table.title,
      type: nodeType,
      position: table.position || { x: 0, y: 0 },
      data: {
        title: table.title,
        columns: table.columns || [],
        is_view: table.is_view,
        schema: table.schema || 'public', // Include schema in node data
      },
    };
  });
}

/**
 * Convert foreign key relationships to ReactFlow edges
 */
export function tablesToEdges(tables: TableState): FlowEdge[] {
  const edges: FlowEdge[] = [];

  Object.values(tables).forEach((table) => {
    if (!table.columns) return;

    table.columns.forEach((column, sourceIndex) => {
      if (column.fk) {
        // Parse FK format: "table_name.column_name"
        const [targetTable, targetColumn] = column.fk.split('.');

        if (targetTable && targetColumn) {
          const edgeId = `${table.title}.${column.title}-${targetTable}.${targetColumn}`;

          // Find target column index in target table
          const targetTableData = tables[targetTable];
          const targetIndex = targetTableData?.columns?.findIndex(
            (col) => col.title === targetColumn
          ) ?? -1;

          if (targetIndex === -1) {
            console.warn(`Target column ${targetColumn} not found in table ${targetTable}`);
            return;
          }

          // Create unique handle IDs matching TableNode format: tableName_columnName_index
          const sourceHandleId = `${table.title}_${column.title}_${sourceIndex}`;
          const targetHandleId = `${targetTable}_${targetColumn}_${targetIndex}`;

          edges.push({
            id: edgeId,
            source: table.title,
            target: targetTable,
            sourceHandle: sourceHandleId,
            targetHandle: targetHandleId,
            type: 'smoothstep',
            animated: false,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#6B7280', // gray-500
            },
            data: {
              sourceColumn: column.title,
              targetColumn: targetColumn,
              relationshipType: 'one-to-many',
            },
          });
        }
      }
    });
  });

  return edges;
}

/**
 * Extract position from ReactFlow nodes back to table format
 */
export function nodesToPositions(nodes: FlowNode[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  nodes.forEach((node) => {
    positions[node.id] = {
      x: node.position.x,
      y: node.position.y,
    };
  });

  return positions;
}

/**
 * Calculate node dimensions based on content
 */
export function calculateNodeDimensions(table: Table) {
  const columnHeight = 32; // Height per column row
  const headerHeight = 52; // Header height
  const padding = 8;
  const minWidth = 200;
  const maxWidth = 400;

  const columnsCount = table.columns?.length || 0;
  const height = headerHeight + (columnsCount * columnHeight) + padding;

  // Calculate width based on longest text
  const longestText = Math.max(
    table.title.length,
    ...(table.columns?.map(col =>
      col.title.length + col.format.length
    ) || [])
  );

  const width = Math.min(
    Math.max(minWidth, longestText * 8),
    maxWidth
  );

  return { width, height };
}

/**
 * Find all tables connected to a given table
 */
export function findConnectedTables(
  tableName: string,
  tables: TableState
): Set<string> {
  const connected = new Set<string>();

  // Find tables this table references (via FK)
  const table = tables[tableName];
  if (table?.columns) {
    table.columns.forEach((column) => {
      if (column.fk) {
        const [targetTable] = column.fk.split('.');
        if (targetTable) connected.add(targetTable);
      }
    });
  }

  // Find tables that reference this table
  Object.values(tables).forEach((otherTable) => {
    if (!otherTable.columns) return;

    otherTable.columns.forEach((column) => {
      if (column.fk) {
        const [targetTable] = column.fk.split('.');
        if (targetTable === tableName) {
          connected.add(otherTable.title);
        }
      }
    });
  });

  return connected;
}

/**
 * Get edges connected to a specific node
 */
export function getConnectedEdges(
  nodeId: string,
  edges: FlowEdge[]
): FlowEdge[] {
  return edges.filter(
    (edge) => edge.source === nodeId || edge.target === nodeId
  );
}

/**
 * Group tables by schema
 */
export function groupTablesBySchema(tables: TableState): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  Object.values(tables).forEach((table) => {
    const schema = table.schema || 'public'; // Default to 'public'
    if (!groups[schema]) {
      groups[schema] = [];
    }
    groups[schema].push(table.title);
  });

  return groups;
}

/**
 * Get all unique schemas from tables
 */
export function getAllSchemas(tables: TableState): string[] {
  const schemas = new Set<string>();

  Object.values(tables).forEach((table) => {
    schemas.add(table.schema || 'public');
  });

  return Array.from(schemas).sort();
}

/**
 * Calculate bounding box for a group of nodes
 */
export function calculateSchemaBoundingBox(
  schemaName: string,
  tables: TableState,
  padding: number = 40
): { x: number; y: number; width: number; height: number } | null {
  // Get all tables in this schema
  const schemaTables = Object.values(tables).filter(
    (table) => (table.schema || 'public') === schemaName
  );

  if (schemaTables.length === 0) {
    return null;
  }

  // Find min/max coordinates
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  schemaTables.forEach((table) => {
    const pos = table.position || { x: 0, y: 0 };
    const dimensions = calculateNodeDimensions(table);

    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + dimensions.width);
    maxY = Math.max(maxY, pos.y + dimensions.height);
  });

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + (padding * 2),
    height: maxY - minY + (padding * 2),
  };
}
