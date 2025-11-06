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
import { ViewNode } from './ViewNode';
import { CustomEdge } from './CustomEdge';
import { RelationshipSelector } from './RelationshipSelector';
import { ContextMenu, createNodeContextMenu, createEdgeContextMenu } from './ContextMenu';
import { tablesToNodes, tablesToEdges } from '@/lib/flow-utils';
import { getLayoutedNodes } from '@/lib/layout';
import { RelationshipType } from '@/types/flow';
import { MarkerType } from '@xyflow/react';
import { toast } from 'sonner';

const nodeTypes = {
  table: TableNode,
  view: ViewNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

function FlowCanvasInner() {
  const { tables, updateTablePosition, getEdgeRelationship, setEdgeRelationship, layoutTrigger, fitViewTrigger, zoomInTrigger, zoomOutTrigger, focusTableId, focusTableTrigger } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedEdge, setSelectedEdge] = useState<{id: string; type: RelationshipType; position: {x: number; y: number}} | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    type: 'node' | 'edge';
    x: number;
    y: number;
    nodeId?: string;
    edgeId?: string;
    isView?: boolean;
  } | null>(null);

  // Connection mode with localStorage persistence
  // Note: setConnectionMode is reserved for future use (connection mode toggle UI)
  const [connectionMode, _setConnectionMode] = useState<'strict' | 'flexible'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('connection-mode');
      return (saved as 'strict' | 'flexible') || 'strict';
    }
    return 'strict';
  });

  // Save connection mode to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('connection-mode', connectionMode);
    }
  }, [connectionMode]);

  const { fitView, zoomIn, zoomOut, getZoom } = useReactFlow();

  // Convert tables to nodes and edges when tables change
  useEffect(() => {
    const flowNodes = tablesToNodes(tables);
    const flowEdges = tablesToEdges(tables).map((edge) => {
      const relationshipType = getEdgeRelationship(edge.id);

      // Configure markers based on relationship type
      const markerEnd = {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#6B7280',
      };

      const markerStart = relationshipType === 'many-to-many' ? {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#6B7280',
      } : undefined;

      return {
        ...edge,
        type: 'custom',
        markerEnd,
        markerStart,
        data: {
          ...edge.data,
          relationshipType,
        },
      };
    });
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

  // Listen for focus table trigger (from search)
  useEffect(() => {
    if (focusTableTrigger > 0 && focusTableId) {
      const node = nodes.find((n) => n.id === focusTableId);
      if (node) {
        // Center and zoom to the selected node
        fitView({
          nodes: [node],
          padding: 0.3,
          duration: 600,
          maxZoom: 1.2,
        });

        // Clear focusTableId after animation completes to prevent re-triggering
        // This ensures the focus only happens once per search action
        setTimeout(() => {
          useStore.setState({ focusTableId: null });
        }, 650); // Slightly longer than animation duration
      }
    }
  }, [focusTableTrigger, focusTableId, nodes, fitView]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl/Cmd + A: Select all nodes
      if (cmdOrCtrl && event.key === 'a') {
        event.preventDefault();
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            selected: true,
          }))
        );
      }

      // Delete: Remove selected nodes
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const hasSelection = nodes.some((node) => node.selected);
        if (hasSelection) {
          event.preventDefault();
          const selectedNodeIds = nodes
            .filter((node) => node.selected)
            .map((node) => node.id);

          // Remove selected nodes
          setNodes((nds) => nds.filter((node) => !node.selected));

          // Remove edges connected to deleted nodes
          setEdges((eds) =>
            eds.filter(
              (edge) =>
                !selectedNodeIds.includes(edge.source) &&
                !selectedNodeIds.includes(edge.target)
            )
          );
        }
      }

      // Space: Fit view (only when not typing in input fields)
      if (event.code === 'Space') {
        const target = event.target as HTMLElement;
        const isInputField = target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.isContentEditable;

        if (!isInputField) {
          event.preventDefault();
          fitView({ padding: 0.2, duration: 400 });
        }
      }

      // Escape: Clear selection
      if (event.key === 'Escape') {
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            selected: false,
          }))
        );
        setSelectedEdge(null);
        setHighlightedEdges(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [nodes, setNodes, setEdges, fitView]);

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

  // Validate connections based on connection mode
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      // Always prevent self-connections
      if (connection.source === connection.target) {
        toast.error('Cannot connect to self', {
          description: 'A table cannot have a relationship with itself',
          position: 'bottom-center',
          duration: 2000,
        });
        return false;
      }

      if (connectionMode === 'flexible') {
        // In flexible mode, allow any valid source → target connection
        return true;
      }

      // Strict mode: only FK columns can start connections
      const sourceNode = nodes.find((n) => n.id === connection.source);
      if (!sourceNode) return false;

      const sourceHandleId = connection.sourceHandle;
      if (!sourceHandleId) return false;

      // Check if source handle is a FK column
      const sourceColumn = sourceNode.data.columns?.find((_col: any, index: number) => {
        const handleId = `${sourceNode.id}_${_col.title}_${index}`;
        return handleId === sourceHandleId;
      });

      const isForeignKey = sourceColumn?.fk !== undefined;

      // Show toast notification if connection is invalid
      if (!isForeignKey) {
        toast.error('Only foreign keys can create connections', {
          description: 'In strict mode, only FK columns (green handles) can start connections',
          position: 'bottom-center',
          duration: 2500,
        });
      }

      // Only allow connection if source column is a FK
      return isForeignKey;
    },
    [connectionMode, nodes]
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
    setContextMenu(null);
  }, []);

  // Handle node context menu (right-click)
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      const isView = node.type === 'view';
      setContextMenu({
        type: 'node',
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        isView,
      });
    },
    []
  );

  // Handle edge context menu (right-click)
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({
        type: 'edge',
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
      });
    },
    []
  );

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
        // Update the edge data and markers immediately
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === selectedEdge.id
              ? {
                  ...edge,
                  markerStart: type === 'many-to-many' ? {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20,
                    color: '#6B7280',
                  } : undefined,
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

  // Context menu actions
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
    },
    [setNodes, setEdges]
  );

  const handleCopyNodeId = useCallback((nodeId: string) => {
    navigator.clipboard.writeText(nodeId).catch((err) => {
      console.error("Failed to copy node ID to clipboard:", err);
    });
  }, []);

  const handleFocusNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        fitView({
          padding: 0.2,
          duration: 400,
          nodes: [node],
        });
      }
    },
    [nodes, fitView]
  );

  const handleHideNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, hidden: true } : node
        )
      );
    },
    [setNodes]
  );

  const handleEdgeDeleteFromMenu = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    },
    [setEdges]
  );

  const handleChangeEdgeType = useCallback(
    (edgeId: string) => {
      const edge = edges.find((e) => e.id === edgeId);
      if (edge) {
        const relationshipType = getEdgeRelationship(edge.id);
        setSelectedEdge({
          id: edge.id,
          type: relationshipType,
          position: contextMenu ? { x: contextMenu.x, y: contextMenu.y } : { x: 0, y: 0 },
        });
      }
      setContextMenu(null);
    },
    [edges, getEdgeRelationship, contextMenu]
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
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onMove={onMove}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
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

      {/* Context Menu */}
      {contextMenu && contextMenu.type === 'node' && contextMenu.nodeId && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={createNodeContextMenu(
            contextMenu.nodeId,
            contextMenu.isView || false,
            () => handleNodeDelete(contextMenu.nodeId!),
            () => handleCopyNodeId(contextMenu.nodeId!),
            () => handleFocusNode(contextMenu.nodeId!),
            () => handleHideNode(contextMenu.nodeId!)
          )}
          onClose={() => setContextMenu(null)}
        />
      )}

      {contextMenu && contextMenu.type === 'edge' && contextMenu.edgeId && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={createEdgeContextMenu(
            contextMenu.edgeId,
            () => handleEdgeDeleteFromMenu(contextMenu.edgeId!),
            () => handleChangeEdgeType(contextMenu.edgeId!)
          )}
          onClose={() => setContextMenu(null)}
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
