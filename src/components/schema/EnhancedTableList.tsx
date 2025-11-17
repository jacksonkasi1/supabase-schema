'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Kbd } from '@/components/ui/kbd';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnhancedTableItem } from './EnhancedTableItem';
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface EnhancedTableListProps {
  onOpenCommand: () => void;
}

export function EnhancedTableList({ onOpenCommand }: EnhancedTableListProps) {
  const { tables } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const tableIds = useMemo(() => Object.keys(tables), [tables]);

  const filteredTableIds = useMemo(() => {
    if (!searchQuery.trim()) return tableIds;
    const query = searchQuery.toLowerCase();
    return tableIds.filter((id) =>
      tables[id]?.title?.toLowerCase().includes(query)
    );
  }, [tableIds, tables, searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredTableIds.indexOf(active.id as string);
      const newIndex = filteredTableIds.indexOf(over.id as string);
      
      // TODO: Update table order in store
      console.log('Reorder:', arrayMove(filteredTableIds, oldIndex, newIndex));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={onOpenCommand}
            placeholder="Search tables..."
            className="h-9 pl-9 pr-16 text-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Kbd>⌘K</Kbd>
          </div>
        </div>
      </div>

      {/* Tables List */}
      <ScrollArea className="flex-1">
        <div className="py-2">
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
                  <EnhancedTableItem key={tableId} tableId={tableId} />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-12 px-4 text-sm text-muted-foreground">
              {searchQuery ? 'No tables found' : 'No tables in schema'}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Table Button */}
      <div className="px-4 py-3 border-t border-border/50">
        <Button className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Table
        </Button>
      </div>
    </div>
  );
}
