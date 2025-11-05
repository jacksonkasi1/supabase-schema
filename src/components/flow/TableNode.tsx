'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableNodeData } from '@/types/flow';

function TableNodeComponent({ data, selected }: NodeProps) {
  const tableData = data as unknown as TableNodeData;

  return (
    <div
      className={cn(
        'rounded-md overflow-hidden bg-warm-gray-100 dark:bg-dark-700',
        'border-2 dark:border-dark-border transition-colors',
        selected && 'border-green-500 ring-2 ring-green-500/20'
      )}
      style={{ minWidth: '200px' }}
    >
      {/* Table Header */}
      <div className="py-2 pb-3 px-2 text-dark-200 dark:text-light-500 bg-warm-gray-200 dark:bg-dark-800 font-medium text-lg text-center border-b-2 dark:border-dark-border">
        {tableData.is_view && (
          <Newspaper className="inline mb-1px mr-2" size={20} />
        )}
        {tableData.title}
      </div>

      {/* Columns */}
      <div className="pb-2">
        {tableData.columns?.map((col, index) => (
          <div key={col.title} className="relative">
            {/* Source Handle (right side) - for FK connections going out */}
            {col.fk && (
              <Handle
                type="source"
                position={Position.Right}
                id={col.title}
                className="!w-3 !h-3 !bg-green-500 !border-2 !border-white dark:!border-dark-700"
                style={{
                  top: `${52 + index * 32 + 16}px`, // Header height + row offset + half row height
                }}
              />
            )}

            {/* Target Handle (left side) - for FK connections coming in */}
            {col.pk && (
              <Handle
                type="target"
                position={Position.Left}
                id={col.title}
                className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-dark-700"
                style={{
                  top: `${52 + index * 32 + 16}px`,
                }}
              />
            )}

            <div
              className={cn(
                'py-1 px-4 flex items-center text-dark-100 dark:text-white-800',
                'border-l-3 border-transparent',
                'hover:bg-warm-gray-200 dark:hover:bg-dark-600 dark:hover:text-white',
                col.pk && 'border-green-500'
              )}
            >
              <p className="flex-grow truncate">{col.title}</p>
              <p className="ml-4 flex-shrink-0 text-sm text-white-900">
                {col.format}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
