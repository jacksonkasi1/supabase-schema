'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { Undo2, Redo2, MoreVertical, History, Trash2 } from 'lucide-react';

export function UndoRedoButtons() {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    getUndoLabel,
    getRedoLabel,
    clearHistory,
    history,
  } = useStore();

  const isUndoAvailable = canUndo();
  const isRedoAvailable = canRedo();
  const undoLabel = getUndoLabel();
  const redoLabel = getRedoLabel();
  const historyCount = history.entries.length;

  // Detect if running on Mac
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  const handleClearHistory = () => {
    const confirmed = window.confirm(
      'Clear all history? This will reset the undo/redo stacks but keep your current schema layout.',
    );
    if (confirmed) {
      clearHistory();
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-1">
        {/* Undo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={undo}
              disabled={!isUndoAvailable}
              aria-label={
                isUndoAvailable ? `Undo: ${undoLabel}` : 'Nothing to undo'
              }
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-2">
            <span>
              {isUndoAvailable ? `Undo: ${undoLabel}` : 'Nothing to undo'}
            </span>
            <Kbd>{isMac ? '⌘Z' : 'Ctrl+Z'}</Kbd>
          </TooltipContent>
        </Tooltip>

        {/* Redo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={redo}
              disabled={!isRedoAvailable}
              aria-label={
                isRedoAvailable ? `Redo: ${redoLabel}` : 'Nothing to redo'
              }
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-2">
            <span>
              {isRedoAvailable ? `Redo: ${redoLabel}` : 'Nothing to redo'}
            </span>
            <Kbd>{isMac ? '⌘⇧Z' : 'Ctrl+Y'}</Kbd>
          </TooltipContent>
        </Tooltip>

        {/* History Options Menu */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="History options"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span>History options</span>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled
              className="text-xs text-muted-foreground"
            >
              <History className="mr-2 h-4 w-4" />
              {historyCount} {historyCount === 1 ? 'entry' : 'entries'} in
              history
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleClearHistory}
              disabled={historyCount <= 1}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear History
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
