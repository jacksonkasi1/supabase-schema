import { Node, Edge } from '@xyflow/react';
import { Column } from '@/lib/types';

// Custom node data for table nodes
export interface TableNodeData extends Record<string, unknown> {
  title: string;
  columns: Column[];
  is_view?: boolean;
}

// Custom node types
export type TableNode = Node<TableNodeData, 'table'>;
export type ViewNode = Node<TableNodeData, 'view'>;
export type FlowNode = TableNode | ViewNode;

// Relationship types
export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

export interface RelationshipTypeInfo {
  label: string;
  description: string;
  color: string;
  sourceMarker: string;
  targetMarker: string;
}

// Custom edge data
export interface EdgeData extends Record<string, unknown> {
  sourceColumn: string;
  targetColumn: string;
  relationshipType: RelationshipType;
}

export type FlowEdge = Edge<EdgeData>;

// Relationship metadata stored separately
export interface EdgeRelationship {
  edgeId: string;
  relationshipType: RelationshipType;
}

// Layout options
export type LayoutDirection = 'TB' | 'BT' | 'LR' | 'RL';

export interface LayoutOptions {
  direction: LayoutDirection;
  nodeSpacing: number;
  rankSpacing: number;
}

// Flow state
export interface FlowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
