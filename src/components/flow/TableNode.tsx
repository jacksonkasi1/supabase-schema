'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Bookmark, FileText, HelpCircle, Key, Link2, Newspaper, Sparkles } from 'lucide-react';
import { cn, getTableHeaderColor } from '@/lib/utils';
import { TableNodeData } from '@/types/flow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function TableNodeComponent({ data, selected, id }: NodeProps) {
  const tableData = data as unknown as TableNodeData;
  const tableName = id; // Node ID is the table name
  const headerColor = getTableHeaderColor(tableName);

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          'rounded-md overflow-hidden',
          'bg-white dark:bg-dark-700',
          'border-2 dark:border-dark-border transition-colors',
          'shadow-md',
          selected && 'border-green-500 ring-2 ring-green-500/20'
        )}
        style={{
          minWidth: '200px',
        }}
      >
        {/* Table Header */}
        <div
          className="py-2 pb-3 px-2 text-dark-200 dark:text-light-500 bg-gray-50 dark:bg-dark-800 font-medium text-lg text-center border-b-2 dark:border-dark-border"
          style={{ borderTopWidth: '4px', borderTopColor: headerColor, borderTopStyle: 'solid' }}
        >
          {tableData.is_view && <Newspaper className="inline mb-1px mr-2" size={20} />}
          {tableData.title}
        </div>

        {/* Columns */}
        <div className="pb-2">
          {tableData.columns?.map((col, index) => {
            const handleId = `${tableName}_${col.title}_${index}`;
            const showEnumInfo = Boolean(col.enumTypeName && col.enumValues && col.enumValues.length > 0);
            const hasDefault = col.default !== undefined && col.default !== null && `${col.default}` !== '';
            const defaultLabel = hasDefault
              ? typeof col.default === 'string'
                ? col.default
                : JSON.stringify(col.default)
              : '';

            return (
              <div key={handleId} className="relative group">
                {col.fk && (
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={handleId}
                    className="!w-3 !h-3 !bg-green-500 !border-2 !border-white dark:!border-dark-700"
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                  />
                )}

                <Handle
                  type="target"
                  position={Position.Left}
                  id={handleId}
                  className={cn(
                    '!w-3 !h-3 !border-2 !border-white dark:!border-dark-700',
                    col.pk ? '!bg-blue-500' : '!bg-gray-400'
                  )}
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                />

                <div
                  className={cn(
                    'py-1 px-4 flex items-center text-dark-100 dark:text-white-800',
                    'border-l-3 border-transparent',
                    'hover:bg-gray-50 dark:hover:bg-dark-600 dark:hover:text-white',
                    col.pk && 'border-green-500'
                  )}
                >
                  <div className="flex items-center gap-1.5 flex-grow min-w-0">
                    {col.pk && <Key size={14} className="text-amber-500" strokeWidth={2} />}
                    {col.fk && <Link2 size={14} className="text-emerald-500" strokeWidth={2} />}
                    <p className="truncate">{col.title}</p>
                  </div>

                  <div className="ml-4 flex items-center gap-1.5 flex-shrink-0">
                    {/* Show bookmark icon for enum types */}
                    {col.format === 'enum' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help text-purple-500 dark:text-purple-300">
                            <Bookmark size={14} strokeWidth={2} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs z-[9999]">
                          <div className="space-y-1">
                            {col.enumTypeName && (
                              <p className="font-semibold text-sm">{col.enumTypeName}</p>
                            )}
                            {col.enumValues && col.enumValues.length > 0 ? (
                              <>
                                <p className="text-xs text-muted-foreground">Values:</p>
                                <div className="flex flex-wrap gap-1">
                                  {col.enumValues.map((value, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                                      '{value}'
                                    </span>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">Enum values not available</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <p className="text-sm text-white-900">{col.format}</p>

                    {!col.required && (
                      <HelpCircle size={14} className="text-slate-400 dark:text-slate-500" strokeWidth={2} />
                    )}

                    {col.comment && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help text-sky-500 dark:text-sky-400">
                            <FileText size={14} strokeWidth={2} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="text-sm">{col.comment}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {hasDefault && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help text-emerald-500 dark:text-emerald-400">
                            <Sparkles size={14} strokeWidth={2} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <code className="text-sm">{defaultLabel}</code>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

export const TableNode = memo(TableNodeComponent);
