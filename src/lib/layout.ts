import dagre from '@dagrejs/dagre';
import { FlowNode, FlowEdge, LayoutOptions } from '@/types/flow';
import { calculateNodeDimensions } from './flow-utils';

const DEFAULT_OPTIONS: LayoutOptions = {
  direction: 'TB',
  nodeSpacing: 50,
  rankSpacing: 100,
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
    const dimensions = calculateNodeDimensions({
      title: node.data.title,
      columns: node.data.columns,
      is_view: node.data.is_view,
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
