'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Bookmark,
  FileText,
  HelpCircle,
  Key,
  Link2,
  Newspaper,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableNodeData } from '@/types/flow';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function ViewNodeComponent({ data, selected, id }: NodeProps) {
  const viewData = data as unknown as TableNodeData;
  const viewName = id; // Node ID is the view name

  return (
    <TooltipProvider delayDuration={150}>
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
            const handleId = `${viewName}_${col.title}_${index}`;
            const hasDefault =
              col.default !== undefined &&
              col.default !== null &&
              `${col.default}` !== '';
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
                    className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-purple-900"
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                  />
                )}

                <Handle
                  type="target"
                  position={Position.Left}
                  id={handleId}
                  className={cn(
                    '!w-3 !h-3 !border-2 !border-white dark:!border-purple-900',
                    col.pk ? '!bg-purple-600' : '!bg-purple-300'
                  )}
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                />

                <div
                  className={cn(
                    'py-1 px-4 flex items-center text-purple-900 dark:text-purple-100',
                    'border-l-3 border-transparent',
                    'hover:bg-purple-100 dark:hover:bg-purple-800',
                    col.pk && 'border-purple-500'
                  )}
                >
                  <div className="flex items-center gap-1.5 flex-grow min-w-0">
                    {col.pk && (
                      <Key
                        size={14}
                        className="text-amber-400"
                        strokeWidth={2}
                      />
                    )}
                    {col.fk && (
                      <Link2
                        size={14}
                        className="text-emerald-400"
                        strokeWidth={2}
                      />
                    )}
                    <p className="truncate">{col.title}</p>
                  </div>

                  <div className="ml-4 flex items-center gap-1.5 flex-shrink-0">
                    {/* Show bookmark icon for enum types */}
                    {col.format === 'enum' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help text-purple-600 dark:text-purple-300">
                            <Bookmark size={14} strokeWidth={2} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="max-w-xs z-[9999]"
                        >
                          <div className="space-y-1">
                            {col.enumTypeName && (
                              <p className="font-semibold text-sm">
                                {col.enumTypeName}
                              </p>
                            )}
                            {col.enumValues && col.enumValues.length > 0 ? (
                              <>
                                <p className="text-xs text-muted-foreground">
                                  Values:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {col.enumValues.map((value, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono"
                                    >
                                      &apos;{value}&apos;
                                    </span>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Enum values not available
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <p className="text-sm text-purple-700 dark:text-purple-200">
                      {col.format}
                    </p>

                    {!col.required && (
                      <HelpCircle
                        size={14}
                        className="text-purple-300 dark:text-purple-500"
                        strokeWidth={2}
                      />
                    )}

                    {col.comment && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help text-purple-400 dark:text-purple-200">
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
                          <div className="cursor-help text-emerald-500 dark:text-emerald-300">
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

export const ViewNode = memo(ViewNodeComponent);
