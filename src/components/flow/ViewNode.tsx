'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableNodeData } from '@/types/flow';

function ViewNodeComponent({ data, selected, id }: NodeProps) {
  const viewData = data as unknown as TableNodeData;
  const viewName = id; // Node ID is the view name

  return (
    <div
      className={cn(
        'rounded-md overflow-hidden',
        'bg-purple-50 dark:bg-purple-950',
        'backdrop-blur-sm',
        'border-2 border-purple-200 dark:border-purple-800 transition-colors',
        'shadow-md',
        selected && 'border-purple-500 ring-2 ring-purple-500/20'
      )}
      style={{
        minWidth: '200px',
        backgroundColor: 'var(--tw-bg-opacity, 1)',
      }}
    >
      {/* View Header */}
      <div className="py-2 pb-3 px-2 text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900 font-medium text-lg text-center border-b-2 border-purple-200 dark:border-purple-800 flex items-center justify-center">
        <Newspaper className="mr-2" size={20} />
        <span>{viewData.title}</span>
      </div>

      {/* Columns */}
      <div className="pb-2">
        {viewData.columns?.map((col, index) => {
          // Create unique handle ID: viewName_columnName_index
          const handleId = `${viewName}_${col.title}_${index}`;

          return (
            <div key={`${col.title}_${index}`} className="relative">
              {/* Source Handle (right side) - for FK connections going out */}
              {col.fk && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={handleId}
                  className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-purple-900"
                  style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
              )}

              {/* Target Handle (left side) - ALL columns can receive connections */}
              <Handle
                type="target"
                position={Position.Left}
                id={handleId}
                className={cn(
                  '!w-3 !h-3 !border-2 !border-white dark:!border-purple-900',
                  col.pk ? '!bg-purple-600' : '!bg-purple-300'
                )}
                style={{
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />

              <div
                className={cn(
                  'py-1 px-4 flex items-center text-purple-900 dark:text-purple-100',
                  'border-l-3 border-transparent',
                  'hover:bg-purple-100 dark:hover:bg-purple-800',
                  col.pk && 'border-purple-500'
                )}
              >
                <p className="flex-grow truncate">{col.title}</p>
                <p className="ml-4 flex-shrink-0 text-sm text-purple-600 dark:text-purple-400">
                  {col.format}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ViewNode = memo(ViewNodeComponent);
