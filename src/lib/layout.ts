import dagre from '@dagrejs/dagre';
import { FlowNode, FlowEdge, LayoutOptions } from '@/types/flow';
import { calculateNodeDimensions } from './flow-utils';

const DEFAULT_OPTIONS: LayoutOptions = {
  direction: 'TB',
  nodeSpacing: 200,  // Increased from 50 to 200 for more horizontal spacing
  rankSpacing: 250,  // Increased from 100 to 250 for more vertical spacing
};

/**
 * Apply dagre layout algorithm to nodes
 */
export function getLayoutedNodes(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: Partial<LayoutOptions> = {}
): FlowNode[] {
  const layoutOptions = { ...DEFAULT_OPTIONS, ...options };
  const dagreGraph = new dagre.graphlib.Graph();

  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: layoutOptions.direction,
    nodesep: layoutOptions.nodeSpacing,
    ranksep: layoutOptions.rankSpacing,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    // Ensure node has valid data
    if (!node.data || !node.id) {
      console.warn(`Skipping node with invalid data:`, node);
      return;
    }

    const dimensions = calculateNodeDimensions({
      title: node.data.title || node.id, // Fallback to node.id if title is missing
      columns: node.data.columns || [],
      is_view: node.data.is_view || false,
    });

    dagreGraph.setNode(node.id, {
      width: dimensions.width,
      height: dimensions.height,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes: FlowNode[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  return layoutedNodes;
}

/**
 * Calculate bounds of all nodes
 */
export function getNodesBounds(nodes: FlowNode[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const dimensions = calculateNodeDimensions({
      title: node.data.title,
      columns: node.data.columns,
      is_view: node.data.is_view,
    });

    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + dimensions.width);
    maxY = Math.max(maxY, node.position.y + dimensions.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Center nodes in viewport
 */
export function centerNodes(
  nodes: FlowNode[],
  viewportWidth: number,
  viewportHeight: number
): FlowNode[] {
  const bounds = getNodesBounds(nodes);
  const offsetX = (viewportWidth - bounds.width) / 2 - bounds.x;
  const offsetY = (viewportHeight - bounds.height) / 2 - bounds.y;

  return nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x + offsetX,
      y: node.position.y + offsetY,
    },
  }));
}

/**
 * Apply layout with schema grouping
 * Groups nodes by schema and lays out each group separately
 * Only groups nodes that have an explicit schema defined
 */
export function getLayoutedNodesWithSchemas(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: Partial<LayoutOptions> = {}
): FlowNode[] {
  const layoutOptions = { ...DEFAULT_OPTIONS, ...options };

  // Separate nodes with schemas from nodes without schemas
  const schemaGroups: Record<string, FlowNode[]> = {};
  const noSchemaNodes: FlowNode[] = [];
  
  nodes.forEach((node) => {
    const schema = (node.data as any).schema;
    if (schema) {
      // Only group if schema is explicitly present
      if (!schemaGroups[schema]) {
        schemaGroups[schema] = [];
      }
      schemaGroups[schema].push(node);
    } else {
      // Nodes without schemas go into a separate group
      noSchemaNodes.push(node);
    }
  });

  // Layout nodes without schemas first (if any)
  let noSchemaLayouted: FlowNode[] = [];
  if (noSchemaNodes.length > 0) {
    const noSchemaNodeIds = new Set(noSchemaNodes.map((n) => n.id));
    const noSchemaEdges = edges.filter(
      (edge) => noSchemaNodeIds.has(edge.source) && noSchemaNodeIds.has(edge.target)
    );
    noSchemaLayouted = getLayoutedNodes(noSchemaNodes, noSchemaEdges, layoutOptions);
  }

  // Layout each schema group separately
  const layoutedGroups: Record<string, FlowNode[]> = {};
  const groupBounds: Record<string, { width: number; height: number }> = {};

  Object.entries(schemaGroups).forEach(([schema, schemaNodes]) => {
    // Filter edges to only include edges within this schema
    const schemaNodeIds = new Set(schemaNodes.map((n) => n.id));
    const schemaEdges = edges.filter(
      (edge) => schemaNodeIds.has(edge.source) && schemaNodeIds.has(edge.target)
    );

    // Layout this schema group
    const layouted = getLayoutedNodes(schemaNodes, schemaEdges, layoutOptions);
    layoutedGroups[schema] = layouted;

    // Calculate bounds for this group
    const bounds = getNodesBounds(layouted);
    groupBounds[schema] = { width: bounds.width, height: bounds.height };
  });

  // Position schema groups horizontally with spacing
  const schemaSpacing = 400; // Horizontal spacing between schema groups
  let currentX = 0;

  const finalLayoutedNodes: FlowNode[] = [];

  // Add nodes without schemas first (no grouping)
  if (noSchemaLayouted.length > 0) {
    finalLayoutedNodes.push(...noSchemaLayouted);
    const noSchemaBounds = getNodesBounds(noSchemaLayouted);
    currentX = noSchemaBounds.width + schemaSpacing;
  }

  // Then add schema groups
  Object.entries(layoutedGroups).forEach(([schema, schemaNodes]) => {
    // Offset all nodes in this group
    const offsetNodes = schemaNodes.map((node) => ({
      ...node,
      position: {
        x: node.position.x + currentX,
        y: node.position.y,
      },
    }));

    finalLayoutedNodes.push(...offsetNodes);
    currentX += groupBounds[schema].width + schemaSpacing;
  });

  return finalLayoutedNodes;
}
