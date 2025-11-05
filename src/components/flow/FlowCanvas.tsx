'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '@/lib/store';
import { TableNode } from './TableNode';
import { CustomEdge } from './CustomEdge';
import { RelationshipSelector } from './RelationshipSelector';
import { tablesToNodes, tablesToEdges } from '@/lib/flow-utils';
import { RelationshipType } from '@/types/flow';

const nodeTypes = {
  table: TableNode,
  view: TableNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

function FlowCanvasInner() {
  const { tables, updateTablePosition, getEdgeRelationship, setEdgeRelationship } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedEdge, setSelectedEdge] = useState<{id: string; type: RelationshipType; position: {x: number; y: number}} | null>(null);

  // Convert tables to nodes and edges when tables change
  useEffect(() => {
    const flowNodes = tablesToNodes(tables);
    const flowEdges = tablesToEdges(tables).map((edge) => ({
      ...edge,
      type: 'custom',
      data: {
        ...edge.data,
        relationshipType: getEdgeRelationship(edge.id),
      },
    }));
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [tables, setNodes, setEdges, getEdgeRelationship]);

  // Handle node drag end to sync position back to store
  const onNodeDragStop = useCallback(
    (_event: any, node: any) => {
      updateTablePosition(node.id, node.position.x, node.position.y);
    },
    [updateTablePosition]
  );

  // Handle multiple nodes drag
  const onNodesDelete = useCallback(
    (deleted: any[]) => {
      // Handle node deletion if needed
      console.log('Nodes deleted:', deleted);
    },
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  // Highlight connected edges on node selection
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(
    new Set()
  );

  const onNodeClick = useCallback(
    (_event: any, node: any) => {
      const connectedEdges = edges.filter(
        (edge) => edge.source === node.id || edge.target === node.id
      );
      setHighlightedEdges(new Set(connectedEdges.map((e) => e.id)));
    },
    [edges]
  );

  const onPaneClick = useCallback(() => {
    setHighlightedEdges(new Set());
    setSelectedEdge(null);
  }, []);

  // Handle edge click to show relationship selector
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      const relationshipType = getEdgeRelationship(edge.id);
      setSelectedEdge({
        id: edge.id,
        type: relationshipType,
        position: {
          x: event.clientX,
          y: event.clientY,
        },
      });
    },
    [getEdgeRelationship]
  );

  // Handle relationship type change
  const handleRelationshipChange = useCallback(
    (type: RelationshipType) => {
      if (selectedEdge) {
        setEdgeRelationship(selectedEdge.id, type);
        // Update the edge data immediately
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === selectedEdge.id
              ? {
                  ...edge,
                  data: {
                    ...edge.data,
                    relationshipType: type,
                  },
                }
              : edge
          )
        );
      }
    },
    [selectedEdge, setEdgeRelationship, setEdges]
  );

  // Handle edge deletion
  const handleEdgeDelete = useCallback(() => {
    if (selectedEdge) {
      setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  }, [selectedEdge, setEdges]);

  // Apply highlighting to edges
  const edgesWithHighlight = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      animated: highlightedEdges.has(edge.id),
      selected: selectedEdge?.id === edge.id,
    }));
  }, [edges, highlightedEdges, selectedEdge]);

  return (
    <div className="w-full h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edgesWithHighlight}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'custom',
          animated: false,
        }}
        className="bg-white dark:bg-dark-900"
      >
        <Background className="dark:opacity-20" />
        <MiniMap
          className="!bg-warm-gray-100 dark:!bg-dark-800 !border-warm-gray-300 dark:!border-dark-border"
          nodeClassName="!fill-warm-gray-300 dark:!fill-dark-700"
        />
      </ReactFlow>

      {/* Relationship Selector */}
      {selectedEdge && (
        <RelationshipSelector
          currentType={selectedEdge.type}
          onSelect={handleRelationshipChange}
          position={selectedEdge.position}
          onClose={() => setSelectedEdge(null)}
          onDelete={handleEdgeDelete}
        />
      )}
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
