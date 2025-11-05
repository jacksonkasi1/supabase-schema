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
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '@/lib/store';
import { TableNode } from './TableNode';
import { CustomEdge } from './CustomEdge';
import { RelationshipSelector } from './RelationshipSelector';
import { tablesToNodes, tablesToEdges } from '@/lib/flow-utils';
import { getLayoutedNodes } from '@/lib/layout';
import { RelationshipType } from '@/types/flow';

const nodeTypes = {
  table: TableNode,
  view: TableNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

function FlowCanvasInner() {
  const { tables, updateTablePosition, getEdgeRelationship, setEdgeRelationship, layoutTrigger, fitViewTrigger, zoomInTrigger, zoomOutTrigger } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedEdge, setSelectedEdge] = useState<{id: string; type: RelationshipType; position: {x: number; y: number}} | null>(null);
  const { fitView, zoomIn, zoomOut, getZoom } = useReactFlow();

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

  // Listen for layout trigger from store
  useEffect(() => {
    if (layoutTrigger > 0 && nodes.length > 0 && edges.length > 0) {
      const layoutedNodes = getLayoutedNodes(nodes, edges, { direction: 'TB' });
      setNodes(layoutedNodes);

      // Update positions in store
      layoutedNodes.forEach((node) => {
        updateTablePosition(node.id, node.position.x, node.position.y);
      });

      // Fit view after layout
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
      }, 50);
    }
  }, [layoutTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for fit view trigger from store
  useEffect(() => {
    if (fitViewTrigger > 0) {
      fitView({ padding: 0.2, duration: 400 });
    }
  }, [fitViewTrigger, fitView]);

  // Listen for zoom in trigger
  useEffect(() => {
    if (zoomInTrigger > 0) {
      zoomIn({ duration: 200 });
      // Dispatch custom event for zoom level display
      setTimeout(() => {
        const zoom = getZoom();
        window.dispatchEvent(new CustomEvent('reactflow:zoom', { detail: { zoom } }));
      }, 250);
    }
  }, [zoomInTrigger, zoomIn, getZoom]);

  // Listen for zoom out trigger
  useEffect(() => {
    if (zoomOutTrigger > 0) {
      zoomOut({ duration: 200 });
      // Dispatch custom event for zoom level display
      setTimeout(() => {
        const zoom = getZoom();
        window.dispatchEvent(new CustomEvent('reactflow:zoom', { detail: { zoom } }));
      }, 250);
    }
  }, [zoomOutTrigger, zoomOut, getZoom]);

  // Emit initial zoom level and listen for zoom changes
  useEffect(() => {
    const zoom = getZoom();
    window.dispatchEvent(new CustomEvent('reactflow:zoom', { detail: { zoom } }));
  }, [getZoom]);

  // Handle ReactFlow zoom changes to update display
  const onMove = useCallback(() => {
    const zoom = getZoom();
    window.dispatchEvent(new CustomEvent('reactflow:zoom', { detail: { zoom } }));
  }, [getZoom]);

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
        onMove={onMove}
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
