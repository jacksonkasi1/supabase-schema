'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '@/lib/store';
import { TableNode } from './TableNode';
import { CustomEdge } from './CustomEdge';
import { RelationshipSelector } from './RelationshipSelector';
import { tablesToNodes, tablesToEdges } from '@/lib/flow-utils';
import { getLayoutedNodes } from '@/lib/layout';
import { LayoutDirection, RelationshipType } from '@/types/flow';
import { Button } from '@/components/ui/button';
import { LayoutGrid } from 'lucide-react';

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
  const [_layoutDirection, setLayoutDirection] = useState<LayoutDirection>('TB');
  const [selectedEdge, setSelectedEdge] = useState<{id: string; type: RelationshipType; position: {x: number; y: number}} | null>(null);
  const { fitView } = useReactFlow();

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

  // Auto-layout function
  const onLayout = useCallback(
    (direction: LayoutDirection) => {
      const layoutedNodes = getLayoutedNodes(nodes, edges, { direction });
      setNodes(layoutedNodes);
      setLayoutDirection(direction);

      // Fit view after layout
      window.requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 400 });
      });
    },
    [nodes, edges, setNodes, fitView]
  );

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
        <Controls className="!bg-white dark:!bg-dark-800 !border-warm-gray-300 dark:!border-dark-border" />
        <MiniMap
          className="!bg-warm-gray-100 dark:!bg-dark-800 !border-warm-gray-300 dark:!border-dark-border"
          nodeClassName="!fill-warm-gray-300 dark:!fill-dark-700"
        />

        {/* Layout Controls */}
        <Panel position="top-left" className="space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onLayout('TB')}
            className="bg-white dark:bg-dark-800"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Layout TB
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onLayout('LR')}
            className="bg-white dark:bg-dark-800"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Layout LR
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fitView({ padding: 0.2, duration: 400 })}
            className="bg-white dark:bg-dark-800"
          >
            Fit View
          </Button>
        </Panel>
      </ReactFlow>

      {/* Relationship Selector */}
      {selectedEdge && (
        <RelationshipSelector
          currentType={selectedEdge.type}
          onSelect={handleRelationshipChange}
          position={selectedEdge.position}
          onClose={() => setSelectedEdge(null)}
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
