'use client';

import { useStore } from '@/lib/store';
import { Column } from '@/lib/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { EnhancedColumnRow } from './EnhancedColumnRow';
import { EnhancedColumnRow } from './EnhancedColumnRow';
import { useState } from 'react';

interface EnhancedColumnEditorProps {
  tableId: string;
  columns: Column[];
}

export function EnhancedColumnEditor({ tableId, columns }: EnhancedColumnEditorProps) {
  const { updateColumn } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id as string);
      const newIndex = parseInt(over.id as string);

      const reorderedColumns = arrayMove(columns, oldIndex, newIndex);
      
      // Update all column positions
      reorderedColumns.forEach((col, index) => {
        updateColumn(tableId, index, col);
      });
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={columns.map((_, index) => index.toString())}
        strategy={verticalListSortingStrategy}
      >
        {columns.map((column, index) => (
          <EnhancedColumnRow
            key={`${column.title}-${index}`}
            tableId={tableId}
            column={column}
            columnIndex={index}
          />
        ))}
      </SortableContext>

      <DragOverlay>
        {activeId !== null && columns[parseInt(activeId)] ? (
          <div className="bg-background border border-border rounded shadow-lg p-2">
            <EnhancedColumnRow
              tableId={tableId}
              column={columns[parseInt(activeId)]}
              columnIndex={parseInt(activeId)}
              isDragOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
