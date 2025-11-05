'use client';

import { memo } from 'react';
import {
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import { RelationshipType } from '@/types/flow';
import { getRelationshipInfo } from '@/lib/relationship-utils';

function CustomEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  markerStart,
  data,
  selected,
}: EdgeProps) {
  const relationshipType: RelationshipType = (data?.relationshipType as RelationshipType) || 'one-to-many';
  const relationshipInfo = getRelationshipInfo(relationshipType);

  // Extend the edge slightly into the nodes for better arrow visibility
  // The arrow marker will be slightly behind/inside the node edge
  const offset = 8; // pixels to extend into node

  // Adjust coordinates based on position to extend edge into nodes
  const adjustedSourceX = sourcePosition === 'right' ? sourceX + offset : sourceX - offset;
  const adjustedTargetX = targetPosition === 'left' ? targetX - offset : targetX + offset;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: adjustedSourceX,
    sourceY,
    sourcePosition,
    targetX: adjustedTargetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          ...style,
          stroke: selected ? relationshipInfo.color : '#94a3b8',
          strokeWidth: selected ? 2.5 : 1.5,
          transition: 'all 0.2s ease',
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            className="px-2 py-1 text-xs font-medium rounded-md shadow-sm cursor-pointer transition-all hover:scale-110"
            style={{
              backgroundColor: selected ? relationshipInfo.color : '#64748b',
              color: 'white',
              border: '1px solid white',
            }}
            data-edge-id={id}
          >
            {relationshipInfo.label}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const CustomEdge = memo(CustomEdgeComponent);
