'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Column } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  MoreVertical,
  GripVertical,
  Plus,
  Trash2,
  Focus,
  Palette,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ColumnEditor } from './ColumnEditor';
import { ColorPickerDialog } from './ColorPickerDialog';
import { cn } from '@/lib/utils';

interface TableItemProps {
  tableId: string;
}

export function TableItem({ tableId }: TableItemProps) {
  const {
    tables,
    expandedTables,
    toggleTableExpanded,
    addColumn,
    deleteTable,
    triggerFocusTable,
  } = useStore();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const table = tables[tableId];
  const isExpanded = expandedTables.has(tableId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!table) return null;

  const handleAddColumn = () => {
    const newColumn: Column = {
      title: 'new_column',
      format: 'varchar',
      type: 'string',
      required: false,
    };
    addColumn(tableId, newColumn);
  };

  const handleFocusTable = () => {
    triggerFocusTable(tableId);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group transition-colors',
          isDragging && 'opacity-50'
        )}
      >
        <Collapsible open={isExpanded} onOpenChange={() => toggleTableExpanded(tableId)}>
          <div
            className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors border-l-[3px] border-transparent hover:border-primary/40"
            style={{
              backgroundColor: isExpanded
                ? `${table.color || 'hsl(var(--primary))'}10`
                : undefined,
            }}
          >
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Expand Icon */}
            <CollapsibleTrigger asChild>
              <button className="shrink-0 hover:bg-accent rounded p-0.5 transition-colors">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>

            {/* Color Indicator */}
            <button
              onClick={() => setShowColorPicker(true)}
              className="shrink-0 hover:scale-110 transition-transform"
            >
              <div
                className="w-3 h-3 rounded-sm border border-border/50"
                style={{ backgroundColor: table.color || 'hsl(var(--primary))' }}
              />
            </button>

            {/* Table Name */}
            <span
              className="flex-1 text-sm font-medium text-foreground truncate cursor-pointer"
              onClick={() => toggleTableExpanded(tableId)}
            >
              {table.title}
            </span>

            {/* Column Count Badge */}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0 font-normal">
              {table.columns?.length || 0}
            </Badge>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleFocusTable}>
                  <Focus className="mr-2 h-3.5 w-3.5" />
                  Focus in canvas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowColorPicker(true)}>
                  <Palette className="mr-2 h-3.5 w-3.5" />
                  Change color
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete table
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CollapsibleContent>
            <div
              className="border-t border-border/20"
              style={{
                backgroundColor: `${table.color || 'hsl(var(--primary))'}05`,
              }}
            >
              {/* Columns List */}
              <div className="py-1">
                {table.columns && table.columns.length > 0 ? (
                  <ColumnEditor tableId={tableId} columns={table.columns} />
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No columns
                  </div>
                )}
              </div>

              {/* Add Column Button */}
              <div className="px-3 pb-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={handleAddColumn}
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Add Column
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Color Picker Dialog */}
      <ColorPickerDialog
        open={showColorPicker}
        onOpenChange={setShowColorPicker}
        tableId={tableId}
        currentColor={table.color}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{table.title}&quot;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteTable(tableId);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
