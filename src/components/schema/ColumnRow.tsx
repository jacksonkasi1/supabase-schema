'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Column } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  GripVertical,
  Key,
  Sparkles,
  Search as SearchIcon,
  Circle,
  MoreVertical,
  Trash2,
  Check,
  ChevronsUpDown,
  Link2,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

const POSTGRES_TYPES = [
  'serial',
  'bigserial',
  'bigint',
  'integer',
  'int',
  'smallint',
  'varchar',
  'text',
  'char',
  'boolean',
  'timestamp',
  'timestamptz',
  'date',
  'time',
  'json',
  'jsonb',
  'uuid',
  'numeric',
  'decimal',
  'real',
  'double precision',
  'bytea',
  'enum',
];

type IndexType = 'primary_key' | 'unique_key' | 'index' | 'none';

interface ColumnRowProps {
  tableId: string;
  column: Column;
  columnIndex: number;
  isDragOverlay?: boolean;
}

export function ColumnRow({
  tableId,
  column,
  columnIndex,
  isDragOverlay = false,
}: ColumnRowProps) {
  const { tables, updateColumn, deleteColumn } = useStore();
  const [typeOpen, setTypeOpen] = useState(false);

  const table = tables[tableId];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnIndex.toString(), disabled: isDragOverlay });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getIndexType = (): IndexType => {
    if (column.pk) return 'primary_key';
    if (column.unique) return 'unique_key';
    const indexes = table?.indexes || [];
    const isInIndex = indexes.some((idx) => idx.columns.includes(column.title));
    if (isInIndex) return 'index';
    return 'none';
  };

  const handleIndexTypeChange = (indexType: IndexType) => {
    const updates: Partial<Column> = {};
    if (indexType === 'primary_key') {
      updates.pk = true;
      updates.unique = false;
      updates.required = true;
    } else if (indexType === 'unique_key') {
      updates.unique = true;
      updates.pk = false;
    } else {
      updates.pk = false;
      updates.unique = false;
    }
    updateColumn(tableId, columnIndex, updates);
  };

  const indexType = getIndexType();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-1.5 px-2.5 py-0.5 hover:bg-muted/50 transition-colors',
        isDragging && 'opacity-0',
        isDragOverlay && 'shadow-lg'
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0 opacity-40 hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Index Type Icon */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0">
            {indexType === 'primary_key' ? (
              <Key className="h-3.5 w-3.5 text-amber-500" />
            ) : indexType === 'unique_key' ? (
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            ) : indexType === 'index' ? (
              <SearchIcon className="h-3.5 w-3.5 text-violet-500" />
            ) : column.fk ? (
              <Link2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuRadioGroup
            value={indexType}
            onValueChange={(value) => handleIndexTypeChange(value as IndexType)}
          >
            <DropdownMenuRadioItem value="primary_key" className="text-sm">
              <Key className="mr-2 h-3.5 w-3.5 text-amber-500" />
              Primary key
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="unique_key" className="text-sm">
              <Sparkles className="mr-2 h-3.5 w-3.5 text-indigo-500" />
              Unique key
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="index" className="text-sm">
              <SearchIcon className="mr-2 h-3.5 w-3.5 text-violet-500" />
              Index
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="none" className="text-sm">
              <Circle className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              None
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Column Name */}
      <Input
        value={column.title}
        onChange={(e) => updateColumn(tableId, columnIndex, { title: e.target.value })}
        className="h-6 flex-1 text-[13px] font-mono border-transparent hover:border-input focus-visible:border-primary bg-transparent px-1.5"
        placeholder="column_name"
      />

      {/* Data Type Combobox */}
      <Popover open={typeOpen} onOpenChange={setTypeOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={typeOpen}
            className="h-6 w-[100px] justify-between text-[11px] font-mono px-1.5 bg-muted/30"
          >
            <span className="truncate">{column.format || column.type || 'varchar'}</span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 border-border/50 shadow-xl" align="end">
          <Command className="bg-popover">
            <CommandInput 
              placeholder="Search type..." 
              className="h-8 text-xs font-mono border-0 outline-none ring-0 focus:outline-none focus:ring-0" 
            />
            <CommandEmpty className="py-2 text-xs text-muted-foreground text-center">No type found.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto p-1">
              {POSTGRES_TYPES.map((type) => (
                <CommandItem
                  key={type}
                  value={type}
                  onSelect={() => {
                    updateColumn(tableId, columnIndex, { format: type });
                    setTypeOpen(false);
                  }}
                  className="text-xs font-mono aria-selected:bg-teal-500/10 aria-selected:text-teal-600 rounded-sm py-1.5"
                >
                  <Check
                    className={cn(
                      'mr-2 h-3 w-3 text-teal-500',
                      (column.format || column.type) === type ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {type}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* NULL/NOT NULL Chip - Like DrawSQL */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() =>
                updateColumn(tableId, columnIndex, {
                  required: !column.required,
                })
              }
              className={cn(
                'h-6 w-7 flex items-center justify-center text-[10px] font-bold rounded border transition-colors shrink-0',
                column.required
                  ? 'bg-teal-500/15 text-teal-600 border-teal-500/30 dark:text-teal-400'
                  : 'bg-muted/30 text-muted-foreground/60 border-border/50 hover:bg-muted/50'
              )}
            >
              {column.required ? 'NN' : 'N'}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{column.required ? 'NOT NULL (click to allow NULL)' : 'Nullable (click to require)'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* More Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              updateColumn(tableId, columnIndex, {
                required: !column.required,
              })
            }
            className="text-sm"
          >
            Set {column.required ? 'NULL' : 'NOT NULL'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => deleteColumn(tableId, columnIndex)} className="text-destructive">
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
