'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
import {
  ContextMenu,
  createNodeContextMenu,
  createEdgeContextMenu,
} from './ContextMenu';
import { tablesToNodes, tablesToEdges, getAllSchemas } from '@/lib/flow-utils';
import { getLayoutedNodesWithSchemas } from '@/lib/layout';
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
  const {
    tables,
    updateTablePosition,
    getEdgeRelationship,
    setEdgeRelationship,
    layoutTrigger,
    fitViewTrigger,
    zoomInTrigger,
    zoomOutTrigger,
    focusTableId,
    focusTableTrigger,
    visibleSchemas,
  } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedEdge, setSelectedEdge] = useState<{
    id: string;
    type: RelationshipType;
    position: { x: number; y: number };
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    type: 'node' | 'edge';
    x: number;
    y: number;
    nodeId?: string;
    edgeId?: string;
    isView?: boolean;
  } | null>(null);
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(
    new Set()
  );

  // Connection mode with localStorage persistence
  const [connectionMode, _setConnectionMode] = useState<'strict' | 'flexible'>(
    () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('connection-mode');
        return (saved as 'strict' | 'flexible') || 'strict';
      }
      return 'strict';
    }
  );

  // Save connection mode to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('connection-mode', connectionMode);
    }
  }, [connectionMode]);

  const { fitView, zoomIn, zoomOut, getZoom } = useReactFlow();

  // Use refs to avoid dependency on functions
  const reactFlowRef = useRef({ fitView, zoomIn, zoomOut, getZoom });
  useEffect(() => {
    reactFlowRef.current = { fitView, zoomIn, zoomOut, getZoom };
  }, [fitView, zoomIn, zoomOut, getZoom]);

  // Track pending layout trigger to auto-trigger after nodes are set
  const pendingLayoutRef = useRef(false);
  const currentLayoutTriggerRef = useRef(0);
  const isApplyingLayoutRef = useRef(false);

  // Convert tables to nodes and edges when tables change (ASYNC to prevent blocking)
  useEffect(() => {
    // Use setTimeout(0) to yield to browser rendering, preventing UI freeze
    const timeoutId = setTimeout(() => {
      console.log('[FlowCanvas] Converting tables to nodes/edges...', {
        tableCount: Object.keys(tables).length,
        visibleSchemasSize: visibleSchemas.size,
        visibleSchemas: Array.from(visibleSchemas),
        isApplyingLayout: isApplyingLayoutRef.current,
      });

      // Filter tables by visible schemas
      // Check if any schemas exist in the database
      const allSchemas = getAllSchemas(tables);
      const hasSchemas = allSchemas.length > 0;
      
      const filteredTables = Object.entries(tables).reduce(
        (acc, [key, table]) => {
          if (!hasSchemas) {
            // No schemas exist - show all tables (default state)
            acc[key] = table;
          } else if (visibleSchemas.size === 0) {
            // Schemas exist but user hid all of them - hide everything
            // Don't add table to acc
          } else {
            // Only show tables that have a schema in visibleSchemas, or tables without schemas
            if (!table.schema || visibleSchemas.has(table.schema)) {
              acc[key] = table;
            }
          }
          return acc;
        },
        {} as typeof tables
      );

      const flowNodes = tablesToNodes(filteredTables);
      const flowEdges = tablesToEdges(filteredTables).map((edge) => {
        const relationshipType = getEdgeRelationship(edge.id);

        const markerEnd = {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#6B7280',
        };

        const markerStart =
          relationshipType === 'many-to-many'
            ? {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#6B7280',
              }
            : undefined;

        // Ensure edge.data exists and has required properties
        if (!edge.data) {
          throw new Error(`Edge ${edge.id} is missing data property`);
        }

        return {
          ...edge,
          type: 'custom',
          markerEnd,
          markerStart,
          data: {
            sourceColumn: edge.data.sourceColumn,
            targetColumn: edge.data.targetColumn,
            relationshipType,
          },
        };
      });

      console.log(
        `[FlowCanvas] Setting ${flowNodes.length} nodes and ${flowEdges.length} edges`
      );
      setNodes(flowNodes);
      setEdges(flowEdges);
      console.log('[FlowCanvas] Nodes/edges set');

      // Reset pending flag if tables are empty
      if (flowNodes.length === 0) {
        pendingLayoutRef.current = false;
        return;
      }

      // If layout was triggered before nodes were ready, trigger it now
      // Use double requestAnimationFrame to ensure React has fully processed state updates
      if (
        pendingLayoutRef.current &&
        flowNodes.length > 0 &&
        flowEdges.length > 0 &&
        !isApplyingLayoutRef.current
      ) {
        isApplyingLayoutRef.current = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            console.log('[FlowCanvas] Auto-triggering layout after nodes set');
            const layoutedNodes = getLayoutedNodesWithSchemas(
              flowNodes,
              flowEdges,
              { direction: 'TB' }
            );
            setNodes(layoutedNodes);

            // Update positions in store
            layoutedNodes.forEach((node) => {
              updateTablePosition(node.id, node.position.x, node.position.y);
            });

            // Fit view after layout
            setTimeout(() => {
              reactFlowRef.current.fitView({ padding: 0.2, duration: 400 });
              isApplyingLayoutRef.current = false;
            }, 50);

            pendingLayoutRef.current = false;
            currentLayoutTriggerRef.current = 0;
          });
        });
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    tables,
    visibleSchemas,
    setNodes,
    setEdges,
    getEdgeRelationship,
    updateTablePosition,
  ]);

  // Listen for layout trigger from store
  useEffect(() => {
    // Skip if we're currently applying layout to prevent infinite loops
    if (isApplyingLayoutRef.current) {
      return;
    }

    // Only process if trigger actually changed (prevents duplicate runs)
    if (
      layoutTrigger > 0 &&
      layoutTrigger !== currentLayoutTriggerRef.current
    ) {
      currentLayoutTriggerRef.current = layoutTrigger;

      if (nodes.length > 0 && edges.length > 0) {
        // Nodes are ready, layout immediately
        console.log('[FlowCanvas] Layout triggered, nodes ready');
        isApplyingLayoutRef.current = true;

        // Use requestAnimationFrame to ensure we're not blocking
        requestAnimationFrame(() => {
          const layoutedNodes = getLayoutedNodesWithSchemas(nodes, edges, {
            direction: 'TB',
          });
          setNodes(layoutedNodes);

          // Update positions in store
          layoutedNodes.forEach((node) => {
            updateTablePosition(node.id, node.position.x, node.position.y);
          });

          // Fit view after layout
          setTimeout(() => {
            reactFlowRef.current.fitView({ padding: 0.2, duration: 400 });
            isApplyingLayoutRef.current = false;
          }, 50);
        });
      } else {
        // Nodes not ready yet, mark as pending
        console.log(
          '[FlowCanvas] Layout triggered but nodes not ready, marking as pending'
        );
        pendingLayoutRef.current = true;
      }
    }
  }, [
    layoutTrigger,
    nodes.length,
    edges.length,
    setNodes,
    updateTablePosition,
  ]); // Only depend on length, not entire arrays

  // Listen for fit view trigger from store
  useEffect(() => {
    if (fitViewTrigger > 0) {
      reactFlowRef.current.fitView({ padding: 0.2, duration: 400 });
    }
  }, [fitViewTrigger]);

  // Listen for zoom in trigger
  useEffect(() => {
    if (zoomInTrigger > 0) {
      reactFlowRef.current.zoomIn({ duration: 200 });
      setTimeout(() => {
        const zoom = reactFlowRef.current.getZoom();
        window.dispatchEvent(
          new CustomEvent('reactflow:zoom', { detail: { zoom } })
        );
      }, 250);
    }
  }, [zoomInTrigger]);

  // Listen for zoom out trigger
  useEffect(() => {
    if (zoomOutTrigger > 0) {
      reactFlowRef.current.zoomOut({ duration: 200 });
      setTimeout(() => {
        const zoom = reactFlowRef.current.getZoom();
        window.dispatchEvent(
          new CustomEvent('reactflow:zoom', { detail: { zoom } })
        );
      }, 250);
    }
  }, [zoomOutTrigger]);

  // Listen for focus table trigger (from search)
  useEffect(() => {
    if (focusTableTrigger > 0 && focusTableId) {
      const node = nodes.find((n) => n.id === focusTableId);
      if (node) {
        reactFlowRef.current.fitView({
          nodes: [node],
          padding: 0.3,
          duration: 600,
          maxZoom: 1.2,
        });

        setTimeout(() => {
          useStore.setState({ focusTableId: null });
        }, 650);
      }
    }
  }, [focusTableTrigger, focusTableId, nodes]);

  // Emit initial zoom level (only once on mount)
  useEffect(() => {
    const zoom = reactFlowRef.current.getZoom();
    window.dispatchEvent(
      new CustomEvent('reactflow:zoom', { detail: { zoom } })
    );
  }, []); // Empty deps - only run once

  // Handle ReactFlow zoom changes to update display
  const onMove = useCallback(() => {
    const zoom = reactFlowRef.current.getZoom();
    window.dispatchEvent(
      new CustomEvent('reactflow:zoom', { detail: { zoom } })
    );
  }, []); // No deps - use ref

  // Keyboard shortcuts (memoized to prevent re-creation)
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
        setNodes((nds) => {
          const hasSelection = nds.some((node) => node.selected);
          if (hasSelection) {
            event.preventDefault();
            const selectedNodeIds = nds
              .filter((node) => node.selected)
              .map((node) => node.id);

            // Remove edges connected to deleted nodes
            setEdges((eds) =>
              eds.filter(
                (edge) =>
                  !selectedNodeIds.includes(edge.source) &&
                  !selectedNodeIds.includes(edge.target)
              )
            );

            return nds.filter((node) => !node.selected);
          }
          return nds;
        });
      }

      // Space: Fit view (only when not typing in input fields)
      if (event.code === 'Space') {
        const target = event.target as HTMLElement;
        const isInputField =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable;

        if (!isInputField) {
          event.preventDefault();
          reactFlowRef.current.fitView({ padding: 0.2, duration: 400 });
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
  }, [setNodes, setEdges]); // Stable deps

  // Handle node drag end to sync position back to store
  const onNodeDragStop = useCallback(
    (_event: any, node: any) => {
      updateTablePosition(node.id, node.position.x, node.position.y);
    },
    [updateTablePosition]
  );

  // Handle multiple nodes drag
  const onNodesDelete = useCallback((deleted: any[]) => {
    console.log('Nodes deleted:', deleted);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  // Validate connections based on connection mode
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (connection.source === connection.target) {
        toast.error('Cannot connect to self', {
          description: 'A table cannot have a relationship with itself',
          position: 'bottom-center',
          duration: 2000,
        });
        return false;
      }

      if (connectionMode === 'flexible') {
        return true;
      }

      const sourceNode = nodes.find((n) => n.id === connection.source);
      if (!sourceNode) return false;

      const sourceHandleId = connection.sourceHandle;
      if (!sourceHandleId) return false;

      const sourceColumn = sourceNode.data.columns?.find(
        (_col: any, index: number) => {
          const handleId = `${sourceNode.id}_${_col.title}_${index}`;
          return handleId === sourceHandleId;
        }
      );

      const isForeignKey = sourceColumn?.fk !== undefined;

      if (!isForeignKey) {
        toast.error('Only foreign keys can create connections', {
          description:
            'In strict mode, only FK columns (green handles) can start connections',
          position: 'bottom-center',
          duration: 2500,
        });
      }

      return isForeignKey;
    },
    [connectionMode, nodes]
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

  const handleRelationshipChange = useCallback(
    (type: RelationshipType) => {
      if (selectedEdge) {
        setEdgeRelationship(selectedEdge.id, type);
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === selectedEdge.id
              ? {
                  ...edge,
                  markerStart:
                    type === 'many-to-many'
                      ? {
                          type: MarkerType.ArrowClosed,
                          width: 20,
                          height: 20,
                          color: '#6B7280',
                        }
                      : undefined,
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

  const handleEdgeDelete = useCallback(() => {
    if (selectedEdge) {
      setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  }, [selectedEdge, setEdges]);

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
      console.error('Failed to copy node ID to clipboard:', err);
    });
  }, []);

  const handleFocusNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        reactFlowRef.current.fitView({
          padding: 0.2,
          duration: 400,
          nodes: [node],
        });
      }
    },
    [nodes]
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
          position: contextMenu
            ? { x: contextMenu.x, y: contextMenu.y }
            : { x: 0, y: 0 },
        });
      }
      setContextMenu(null);
    },
    [edges, getEdgeRelationship, contextMenu]
  );

  // Apply highlighting to edges (memoized)
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
