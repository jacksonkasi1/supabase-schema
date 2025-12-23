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
import { ViewNode } from './ViewNode';
import { ModernTableNode } from './ModernTableNode';
import { CustomEdge } from './CustomEdge';
import { RelationshipSelector } from './RelationshipSelector';
import {
  ContextMenu,
  createNodeContextMenu,
  createEdgeContextMenu,
} from './ContextMenu';
import { tablesToNodes, tablesToEdges, getAllSchemas } from '@/lib/flow-utils';
import { getLayoutedNodesWithSchemas } from '@/lib/layout';
import { RelationshipType, FlowEdge } from '@/types/flow';
import { MarkerType } from '@xyflow/react';
import { toast } from 'sonner';
import { Lock, Unlock } from 'lucide-react';
import { Table, TableState } from '@/lib/types';

const nodeTypes = {
  table: ModernTableNode,
  view: ViewNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

type CopiedTableEntry = {
  key: string;
  table: Table;
};

type CopiedSelection = {
  tables: CopiedTableEntry[];
  center: {
    x: number;
    y: number;
  };
};

const cloneTable = (table: Table): Table => JSON.parse(JSON.stringify(table));

const buildCandidateKey = (
  schema: string | undefined,
  baseName: string,
  attempt: number,
) => {
  const suffix = attempt === 1 ? '_copy' : `_copy_${attempt}`;
  const nameWithSuffix = `${baseName}${suffix}`;
  return schema ? `${schema}.${nameWithSuffix}` : nameWithSuffix;
};

const createUniqueTableKey = (baseKey: string, occupiedKeys: Set<string>) => {
  const parts = baseKey.split('.');
  const schema = parts.length > 1 ? parts[0] : undefined;
  const baseName = parts.length > 1 ? parts.slice(1).join('.') : baseKey;

  let attempt = 1;
  let candidate = buildCandidateKey(schema, baseName, attempt);

  while (occupiedKeys.has(candidate)) {
    attempt += 1;
    candidate = buildCandidateKey(schema, baseName, attempt);
  }

  return candidate;
};

type ParsedForeignKey = {
  schema?: string;
  table: string;
  column: string;
};

const parseForeignKey = (fk?: string | null): ParsedForeignKey | null => {
  if (!fk) return null;
  const cleaned = fk.trim();
  if (!cleaned) return null;
  const segments = cleaned.split('.');
  if (segments.length < 2) return null;

  const column = segments.pop()!;
  const table = segments.pop()!;
  const schema = segments.length > 0 ? segments.join('.') : undefined;

  return { schema, table, column };
};

const isInputLikeElement = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable
  );
};

function FlowCanvasInner() {
  const {
    tables,
    updateTablePosition,
    updateColumn,
    getEdgeRelationship,
    setEdgeRelationship,
    layoutTrigger,
    fitViewTrigger,
    zoomInTrigger,
    zoomOutTrigger,
    focusTableId,
    focusTableTrigger,
    visibleSchemas,
    expandTable,
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
    new Set(),
  );
  const copiedSelectionRef = useRef<CopiedSelection | null>(null);
  const pasteOffsetRef = useRef(0);

  // Track manually deleted edges to prevent auto-restore
  const deletedEdgesRef = useRef<Set<string>>(new Set());

  // Connection mode with localStorage persistence
  const [connectionMode, setConnectionMode] = useState<'strict' | 'flexible'>(
    () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('connection-mode');
        return (saved as 'strict' | 'flexible') || 'flexible';
      }
      return 'flexible';
    },
  );

  // Save connection mode to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('connection-mode', connectionMode);
    }
  }, [connectionMode]);

  const { fitView, zoomIn, zoomOut, getZoom, screenToFlowPosition } =
    useReactFlow();

  // Use refs to avoid dependency on functions
  const reactFlowRef = useRef({ fitView, zoomIn, zoomOut, getZoom });
  useEffect(() => {
    reactFlowRef.current = { fitView, zoomIn, zoomOut, getZoom };
  }, [fitView, zoomIn, zoomOut, getZoom]);
  const nodesRef = useRef<any[]>([]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);
  const lastCursorPositionRef = useRef<{ x: number; y: number } | null>(null);
  const pasteInProgressRef = useRef(false);

  const updateCursorPosition = useCallback(
    (event: React.MouseEvent) => {
      if (!screenToFlowPosition) return;
      lastCursorPositionRef.current = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
    },
    [screenToFlowPosition],
  );

  // Track pending layout trigger to auto-trigger after nodes are set
  const pendingLayoutRef = useRef(false);
  const currentLayoutTriggerRef = useRef(0);
  const isApplyingLayoutRef = useRef(false);
  const fitViewRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        {} as typeof tables,
      );

      const flowNodes = tablesToNodes(filteredTables);
      // Ensure all nodes have unique IDs
      const nodesWithUniqueIds = flowNodes.map((node, index) => ({
        ...node,
        id: node.id || `node-${index}`, // Fallback ID if missing
      }));

      const flowEdges: FlowEdge[] = tablesToEdges(filteredTables)
        .filter((edge) => !deletedEdgesRef.current.has(edge.id))
        .map((edge, index) => {
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
            id: edge.id || `edge-${index}`, // Ensure edge has ID
            type: 'custom',
            markerEnd,
            markerStart,
            data: {
              sourceColumn: edge.data.sourceColumn,
              targetColumn: edge.data.targetColumn,
              relationshipType,
            },
          } as FlowEdge;
        });

      console.log(
        `[FlowCanvas] Setting ${nodesWithUniqueIds.length} nodes and ${flowEdges.length} edges`,
      );
      setNodes(nodesWithUniqueIds);
      setEdges(flowEdges);
      console.log('[FlowCanvas] Nodes/edges set');

      // Reset pending flag if tables are empty
      if (nodesWithUniqueIds.length === 0) {
        pendingLayoutRef.current = false;
        return;
      }

      // If layout was triggered before nodes were ready, trigger it now
      // Use double requestAnimationFrame to ensure React has fully processed state updates
      if (
        pendingLayoutRef.current &&
        nodesWithUniqueIds.length > 0 &&
        flowEdges.length > 0 &&
        !isApplyingLayoutRef.current
      ) {
        isApplyingLayoutRef.current = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            console.log('[FlowCanvas] Auto-triggering layout after nodes set');
            const layoutedNodes = getLayoutedNodesWithSchemas(
              nodesWithUniqueIds,
              flowEdges,
              { direction: 'TB' },
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

          // Fit view after layout - retry if ReactFlow isn't ready
          let retryCount = 0;
          const maxRetries = 20; // Maximum 1 second of retries (20 * 50ms)
          const attemptFitView = () => {
            if (reactFlowRef.current?.fitView) {
              reactFlowRef.current.fitView({ padding: 0.2, duration: 400 });
              isApplyingLayoutRef.current = false;
            } else if (retryCount < maxRetries) {
              retryCount++;
              // Retry after a short delay if ReactFlow isn't ready yet
              setTimeout(attemptFitView, 50);
            } else {
              // Max retries reached, stop trying
              isApplyingLayoutRef.current = false;
            }
          };
          setTimeout(attemptFitView, 50);
        });
      } else {
        // Nodes not ready yet, mark as pending
        console.log(
          '[FlowCanvas] Layout triggered but nodes not ready, marking as pending',
        );
        pendingLayoutRef.current = true;
      }
    }
  }, [layoutTrigger, nodes, edges, setNodes, updateTablePosition]);

  // Listen for fit view trigger from store
  useEffect(() => {
    // Clear any pending retry
    if (fitViewRetryTimeoutRef.current) {
      clearTimeout(fitViewRetryTimeoutRef.current);
      fitViewRetryTimeoutRef.current = null;
    }

    if (fitViewTrigger > 0) {
      let retryCount = 0;
      const maxRetries = 20; // Maximum 1 second of retries (20 * 50ms)
      const attemptFitView = () => {
        if (reactFlowRef.current?.fitView) {
          reactFlowRef.current.fitView({ padding: 0.2, duration: 400 });
          fitViewRetryTimeoutRef.current = null;
        } else if (retryCount < maxRetries) {
          retryCount++;
          // Retry after a short delay if ReactFlow isn't ready yet
          fitViewRetryTimeoutRef.current = setTimeout(attemptFitView, 50);
        } else {
          fitViewRetryTimeoutRef.current = null;
        }
      };
      attemptFitView();
    }

    // Cleanup on unmount or when trigger changes
    return () => {
      if (fitViewRetryTimeoutRef.current) {
        clearTimeout(fitViewRetryTimeoutRef.current);
        fitViewRetryTimeoutRef.current = null;
      }
    };
  }, [fitViewTrigger]);

  // Listen for zoom in trigger
  useEffect(() => {
    if (zoomInTrigger > 0 && reactFlowRef.current?.zoomIn) {
      reactFlowRef.current.zoomIn({ duration: 200 });
      setTimeout(() => {
        const zoom = reactFlowRef.current?.getZoom?.();
        if (zoom !== undefined) {
          window.dispatchEvent(
            new CustomEvent('reactflow:zoom', { detail: { zoom } }),
          );
        }
      }, 250);
    }
  }, [zoomInTrigger]);

  // Listen for zoom out trigger
  useEffect(() => {
    if (zoomOutTrigger > 0 && reactFlowRef.current?.zoomOut) {
      reactFlowRef.current.zoomOut({ duration: 200 });
      setTimeout(() => {
        const zoom = reactFlowRef.current?.getZoom?.();
        if (zoom !== undefined) {
          window.dispatchEvent(
            new CustomEvent('reactflow:zoom', { detail: { zoom } }),
          );
        }
      }, 250);
    }
  }, [zoomOutTrigger]);

  // Listen for focus table trigger (from search)
  useEffect(() => {
    if (focusTableTrigger > 0 && focusTableId) {
      const node = nodes.find((n) => n.id === focusTableId);
      if (node && reactFlowRef.current?.fitView) {
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
    const zoom = reactFlowRef.current?.getZoom?.();
    if (zoom !== undefined) {
      window.dispatchEvent(
        new CustomEvent('reactflow:zoom', { detail: { zoom } }),
      );
    }
  }, []); // Empty deps - only run once

  // Handle ReactFlow zoom changes to update display
  const onMove = useCallback(() => {
    const zoom = reactFlowRef.current?.getZoom?.();
    if (zoom !== undefined) {
      window.dispatchEvent(
        new CustomEvent('reactflow:zoom', { detail: { zoom } }),
      );
    }
  }, []); // No deps - use ref

  const copySelectedTables = useCallback(() => {
    const selectedNodes =
      nodesRef.current?.filter((node) => node.selected) ?? [];

    if (!selectedNodes.length) {
      toast.error('Select at least one table to copy');
      return false;
    }

    const storeTables = useStore.getState().tables;
    const copiedTables: CopiedTableEntry[] = selectedNodes
      .map((node) => {
        const tableData = storeTables[node.id];
        if (!tableData) return null;
        return {
          key: node.id,
          table: cloneTable(tableData),
        };
      })
      .filter(Boolean) as CopiedTableEntry[];

    if (!copiedTables.length) {
      toast.error('Unable to copy the selected tables');
      return false;
    }

    const xs = copiedTables.map(({ table }) => table.position?.x ?? 0);
    const ys = copiedTables.map(({ table }) => table.position?.y ?? 0);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const center = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    };

    copiedSelectionRef.current = { tables: copiedTables, center };
    pasteOffsetRef.current = 0;
    toast.success(
      `Copied ${copiedTables.length} table${copiedTables.length === 1 ? '' : 's'
      }`,
    );
    return true;
  }, []);

  const pasteCopiedTables = useCallback(() => {
    // Prevent duplicate pastes with debouncing
    if (pasteInProgressRef.current) {
      return false;
    }

    const payload = copiedSelectionRef.current;

    if (!payload || payload.tables.length === 0) {
      toast.error('Copy tables first before pasting');
      return false;
    }

    pasteInProgressRef.current = true;

    const state = useStore.getState();
    const existingKeys = new Set(Object.keys(state.tables));
    const newTables: TableState = {};
    const newKeyMap = new Map<string, string>();

    const payloadCenter = payload.center ?? { x: 0, y: 0 };
    const cursorPosition = lastCursorPositionRef.current;
    let deltaX = 0;
    let deltaY = 0;

    if (cursorPosition) {
      deltaX = cursorPosition.x - payloadCenter.x;
      deltaY = cursorPosition.y - payloadCenter.y;
      pasteOffsetRef.current = 0;
    } else {
      pasteOffsetRef.current += 1;
      const offsetAmount = pasteOffsetRef.current * 40;
      deltaX = offsetAmount;
      deltaY = offsetAmount;
    }

    payload.tables.forEach(({ key, table }) => {
      const nextKey = createUniqueTableKey(key, existingKeys);
      existingKeys.add(nextKey);
      newKeyMap.set(key, nextKey);

      const duplicatedTable = cloneTable(table);
      duplicatedTable.title = nextKey;
      const baseX = duplicatedTable.position?.x ?? 0;
      const baseY = duplicatedTable.position?.y ?? 0;
      duplicatedTable.position = {
        x: baseX + deltaX,
        y: baseY + deltaY,
      };

      newTables[nextKey] = duplicatedTable;
    });

    Object.values(newTables).forEach((table) => {
      if (!table.columns) return;

      table.columns = table.columns.map((column) => {
        if (!column.fk) {
          return { ...column };
        }

        const parsed = parseForeignKey(column.fk);
        if (!parsed) {
          return { ...column };
        }

        const originalTargetKey = parsed.schema
          ? `${parsed.schema}.${parsed.table}`
          : parsed.table;

        if (newKeyMap.has(originalTargetKey)) {
          const mappedKey = newKeyMap.get(originalTargetKey)!;
          return {
            ...column,
            fk: `${mappedKey}.${parsed.column}`,
          };
        }

        return { ...column, fk: undefined };
      });
    });

    state.addTables(newTables);
    const newCount = Object.keys(newTables).length;
    toast.success(`Pasted ${newCount} table${newCount === 1 ? '' : 's'}`);

    // Reset paste flag after a short delay to prevent rapid duplicate pastes
    setTimeout(() => {
      pasteInProgressRef.current = false;
    }, 100);

    return true;
  }, []);

  // Keyboard shortcuts (memoized to prevent re-creation)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;
      const isInputField = isInputLikeElement(event.target);

      // Ctrl/Cmd + A: Select all nodes
      if (cmdOrCtrl && event.key === 'a') {
        if (isInputField) return;
        event.preventDefault();
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            selected: true,
          })),
        );
      }

      // Ctrl/Cmd + C: Copy selection
      if (cmdOrCtrl && event.key.toLowerCase() === 'c') {
        if (isInputField) return;
        const copied = copySelectedTables();
        if (copied) {
          event.preventDefault();
        }
      }

      // Ctrl/Cmd + V: Paste copied tables
      if (cmdOrCtrl && event.key.toLowerCase() === 'v') {
        if (isInputField) return;
        if (pasteInProgressRef.current) {
          event.preventDefault();
          return;
        }
        event.preventDefault(); // Prevent React Flow's built-in paste
        const pasted = pasteCopiedTables();
        if (!pasted) {
          // If paste failed, reset the flag immediately
          pasteInProgressRef.current = false;
        }
      }

      // Delete / Backspace: Remove selected nodes
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (isInputField) return;
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
                  !selectedNodeIds.includes(edge.target),
              ),
            );

            return nds.filter((node) => !node.selected);
          }
          return nds;
        });
      }

      // Space: Fit view (ignore when typing)
      if (event.code === 'Space') {
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
          })),
        );
        setSelectedEdge(null);
        setHighlightedEdges(new Set());
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'v' || key === 'meta' || key === 'control') {
        pasteInProgressRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setNodes, setEdges, copySelectedTables, pasteCopiedTables]);

  // Handle node drag end to sync position back to store
  const onNodeDragStop = useCallback(
    (_event: any, node: any) => {
      updateTablePosition(node.id, node.position.x, node.position.y);
    },
    [updateTablePosition],
  );

  // Handle multiple nodes drag
  const onNodesDelete = useCallback((deleted: any[]) => {
    console.log('Nodes deleted:', deleted);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      // Helper to parse handle ids: "<table>_<col>_<index>"
      const parseHandle = (handleId?: string | null) => {
        if (!handleId) return null;
        const parts = handleId.split('_');
        const idxPart = parts.pop();
        const index = idxPart ? Number(idxPart) : NaN;
        const col = parts.pop() ?? '';
        const table = parts.join('_');
        return { table, col, index };
      };

      try {
        const src = parseHandle(params.sourceHandle as string | null);
        const tgt = parseHandle(params.targetHandle as string | null);

        if (
          src &&
          tgt &&
          !Number.isNaN(src.index) &&
          !Number.isNaN(tgt.index)
        ) {
          // Persist FK on the source column so tablesToEdges will regenerate this relationship
          const fkValue = `${tgt.table}.${tgt.col}`;
          updateColumn(src.table, src.index, { fk: fkValue });

          toast.success('Relationship created', {
            description: `${src.table}.${src.col} → ${tgt.table}.${tgt.col}`,
            position: 'bottom-center',
            duration: 2000,
          });
        }
      } catch (err) {
        console.error('Failed to persist FK on connect:', err);
      }

      // Still add the visual edge immediately for instant feedback
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges, updateColumn],
  );

  // Validate connections based on connection mode
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      // Allow self-referencing tables (valid DB pattern like manager_id → id)
      // But block connecting a column to itself (meaningless)
      if (
        connection.source === connection.target &&
        connection.sourceHandle === connection.targetHandle
      ) {
        toast.error('Cannot connect column to itself', {
          description: 'A column cannot reference itself',
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
        },
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
    [connectionMode, nodes],
  );

  const onNodeClick = useCallback(
    (_event: any, node: any) => {
      const connectedEdges = edges.filter(
        (edge) => edge.source === node.id || edge.target === node.id,
      );
      setHighlightedEdges(new Set(connectedEdges.map((e) => e.id)));
      // Expand table in sidebar when clicked on canvas
      expandTable(node.id);
    },
    [edges, expandTable],
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
    [],
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
    [],
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
    [getEdgeRelationship],
  );

  // Helper to remove FK from source column when deleting an edge
  const removeFkFromEdge = useCallback(
    (edgeId: string) => {
      // Edge ID format: "sourceTable.sourceColumn-targetTable.targetColumn"
      const edgeParts = edgeId.split('-');
      if (edgeParts.length === 2) {
        const [sourceInfo] = edgeParts;
        const sourceParts = sourceInfo.split('.');
        if (sourceParts.length >= 2) {
          const sourceColumn = sourceParts[sourceParts.length - 1];
          const sourceTable = sourceParts.slice(0, -1).join('.');

          const table = tables[sourceTable];
          if (table?.columns) {
            const columnIndex = table.columns.findIndex(
              (col) => col.title === sourceColumn,
            );
            if (columnIndex >= 0) {
              updateColumn(sourceTable, columnIndex, { fk: undefined });
            }
          }
        }
      }
    },
    [tables, updateColumn],
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
              : edge,
          ),
        );
      }
    },
    [selectedEdge, setEdgeRelationship, setEdges],
  );

  const handleEdgeDelete = useCallback(() => {
    if (selectedEdge) {
      // Remove FK from source column to persist the deletion
      removeFkFromEdge(selectedEdge.id);

      setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
      setSelectedEdge(null);

      toast.success('Relationship deleted', {
        position: 'bottom-center',
        duration: 2000,
      });
    }
  }, [selectedEdge, setEdges, removeFkFromEdge]);

  const onEdgesDelete = useCallback(
    (edges: Edge[]) => {
      let deletedCount = 0;
      edges.forEach((edge) => {
        removeFkFromEdge(edge.id);
        deletedEdgesRef.current.add(edge.id);
        deletedCount++;
      });

      if (deletedCount > 0) {
        toast.success(`Relationship${deletedCount > 1 ? 's' : ''} deleted`, {
          position: 'bottom-center',
          duration: 2000,
        });
      }
    },
    [removeFkFromEdge],
  );

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
    },
    [setNodes, setEdges],
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
    [nodes],
  );

  const handleHideNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, hidden: true } : node,
        ),
      );
    },
    [setNodes],
  );

  const handleEdgeDeleteFromMenu = useCallback(
    (edgeId: string) => {
      // Remove FK from source column to persist the deletion
      removeFkFromEdge(edgeId);

      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));

      toast.success('Relationship deleted', {
        position: 'bottom-center',
        duration: 2000,
      });
    },
    [setEdges, removeFkFromEdge],
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
    [edges, getEdgeRelationship, contextMenu],
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
    <div
      className="w-full h-screen"
      ref={flowWrapperRef}
      onMouseMove={updateCursorPosition}
    >
      <ReactFlow
        nodes={nodes}
        edges={edgesWithHighlight}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
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

      {/* Connection Mode Toggle */}
      <div className="absolute bottom-28 left-4 z-10">
        <button
          onClick={() => setConnectionMode(prev => prev === 'flexible' ? 'strict' : 'flexible')}
          className={`p-2 rounded-lg border transition-all shadow-sm hover:shadow-md ${connectionMode === 'flexible'
            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400'
            }`}
          title={connectionMode === 'flexible'
            ? 'Flex Mode: Any column can connect to any column. Click to switch to Strict Mode.'
            : 'Strict Mode: Only FK columns can start connections. Click to switch to Flex Mode.'}
        >
          {connectionMode === 'flexible' ? (
            <Unlock size={18} />
          ) : (
            <Lock size={18} />
          )}
        </button>
      </div>

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
            () => handleHideNode(contextMenu.nodeId!),
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
            () => handleChangeEdgeType(contextMenu.edgeId!),
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
