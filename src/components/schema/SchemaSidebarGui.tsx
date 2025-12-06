'use client';

import { useStore } from '@/lib/store';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Kbd } from '@/components/ui/kbd';
import { Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { TableCollapsible } from './TableCollapsible';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

export function SchemaSidebarGui() {
  const { tables, reorderTables } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const tableIds = useMemo(() => Object.keys(tables), [tables]);

  const filteredTableIds = useMemo(() => {
    if (!searchQuery.trim()) return tableIds;
    const query = searchQuery.toLowerCase();
    return tableIds.filter((id) =>
      tables[id]?.title?.toLowerCase().includes(query)
    );
  }, [tableIds, tables, searchQuery]);

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tableIds.indexOf(active.id as string);
      const newIndex = tableIds.indexOf(over.id as string);

      // Reorder all tables, not just filtered ones
      const reorderedIds = arrayMove(tableIds, oldIndex, newIndex);
      reorderTables(reorderedIds);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search - DrawSQL Style */}
      <div className="px-3 py-2 border-b border-border/20">
        <InputGroup className="h-8 rounded-md border-border/30 bg-muted/15 hover:bg-muted/25 focus-within:bg-background focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/15 transition-all">
          <InputGroupAddon className="pl-2.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground/70" />
          </InputGroupAddon>
          <InputGroupInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tables..."
            className="h-full text-[12px] px-2 py-0 placeholder:text-muted-foreground/50"
          />
          <InputGroupAddon className="pr-2.5">
            <Kbd className="text-[10px] px-1.5 py-0.5 bg-muted/40 border-border/30">⌘K</Kbd>
          </InputGroupAddon>
        </InputGroup>
      </div>

      {/* Tables List - DrawSQL Style with Drag & Drop */}
      <ScrollArea className="flex-1">
        <div className="py-0">
          {filteredTableIds.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredTableIds}
                strategy={verticalListSortingStrategy}
              >
                {filteredTableIds.map((tableId) => (
                  <TableCollapsible key={tableId} tableId={tableId} />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-12 px-6 text-sm text-muted-foreground">
              <p className="font-medium mb-1">
                {searchQuery ? 'No tables found' : 'No tables yet'}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {searchQuery ? 'Try a different search term' : 'Create your first table to get started'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
