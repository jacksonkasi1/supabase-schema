'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Key, Link2, Sparkles, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableNodeData } from '@/types/flow';

function ModernTableNodeComponent({ data, selected, id }: NodeProps) {
  const tableData = data as unknown as TableNodeData;
  const tableName = id;
  const headerColor = (tableData as any).color || '#3B82F6';

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden bg-background shadow-lg transition-all',
        'border-2',
        selected ? 'border-primary ring-2 ring-primary/20 shadow-xl' : 'border-border'
      )}
      style={{
        minWidth: '240px',
        maxWidth: '320px',
      }}
    >
      {/* Table Header */}
      <div
        className="py-2.5 px-3 text-foreground font-semibold text-base border-t-[4px]"
        style={{
          borderTopColor: headerColor,
          backgroundColor: `${headerColor}10`,
        }}
      >
        {tableData.title}
      </div>

      {/* Columns */}
      <div className="bg-background">
        {tableData.columns?.map((col, index) => {
          const handleId = `${tableName}_${col.title}_${index}`;
          const isPK = col.pk;
          const isFK = col.fk;
          const isUnique = col.unique;
          const isNullable = !col.required;

          return (
            <div
              key={handleId}
              className={cn(
                'relative group py-2 px-3 flex items-center gap-2 border-b border-border/50 last:border-b-0',
                'hover:bg-muted/40 transition-colors',
                'border-l-[3px] border-transparent',
                isPK && 'border-l-yellow-500/50'
              )}
            >
              {/* Connection Handles */}
              {isFK && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={handleId}
                  className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-background"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                />
              )}

              <Handle
                type="target"
                position={Position.Left}
                id={handleId}
                className={cn(
                  '!w-2.5 !h-2.5 !border-2 !border-background',
                  isPK ? '!bg-blue-500' : '!bg-muted-foreground/40'
                )}
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              />

              {/* Index Type Icon */}
              <div className="shrink-0">
                {isPK ? (
                  <Key className="h-3.5 w-3.5 text-yellow-500" />
                ) : isUnique ? (
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                ) : isFK ? (
                  <Link2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Circle className="h-2 w-2 text-muted-foreground/30" />
                )}
              </div>

              {/* Column Name */}
              <span className="flex-1 text-sm font-medium truncate font-mono">
                {col.title}
              </span>

              {/* Data Type */}
              <span className="text-xs text-muted-foreground font-mono shrink-0">
                {col.format || col.type}
              </span>

              {/* NULL Indicator */}
              {isNullable && (
                <span className="text-[10px] text-muted-foreground/50 shrink-0 font-bold">
                  N
                </span>
              )}
            </div>
          );
        })}

        {(!tableData.columns || tableData.columns.length === 0) && (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No columns
          </div>
        )}
      </div>
    </div>
  );
}

export const ModernTableNode = memo(ModernTableNodeComponent);
