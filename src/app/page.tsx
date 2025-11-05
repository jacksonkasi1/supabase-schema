'use client';

import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Table } from '@/components/Table';
import { Helper } from '@/components/Helper';
import { ChatSidebar } from '@/components/ChatSidebar';
import { SelectionArea, SelectionEvent } from '@viselect/react';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { tables, schemaView, updateSchemaViewTranslate, updateSchemaViewScale, tableSelected, setTableSelected } = useStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingChild, setIsDraggingChild] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Clear previous v1 localstorage
    if (localStorage.getItem('url') != null) {
      localStorage.clear();
      location.reload();
    }
  }, []);

  const scrollEvent = (e: WheelEvent) => {
    if (isDraggingChild) return;
    let scaleFactor = 1.05;

    if (checkIsTrackpad(e)) {
      dragEvent(e);
    } else {
      const xs = (e.clientX - schemaView.translate.x) / schemaView.scale;
      const ys = (e.clientY - schemaView.translate.y) / schemaView.scale;

      if (-e.deltaY > 0) {
        if (schemaView.scale <= 3) {
          updateSchemaViewScale(schemaView.scale * scaleFactor);
        }
      } else {
        if (schemaView.scale >= 0.5) {
          updateSchemaViewScale(schemaView.scale / scaleFactor);
        }
      }

      updateSchemaViewTranslate(
        e.clientX - xs * schemaView.scale,
        e.clientY - ys * schemaView.scale
      );
    }
  };

  const checkIsTrackpad = (e: WheelEvent): boolean => {
    let isTrackpad = false;
    if ((e as any).wheelDeltaY) {
      if ((e as any).wheelDeltaY === e.deltaY * -3) {
        isTrackpad = true;
      }
    } else if (e.deltaMode === 0) {
      isTrackpad = true;
    }
    return isTrackpad;
  };

  const dragStart = (e: React.MouseEvent) => {
    if (e.button !== 1) return; // Middle mouse button
    setIsDragging(true);
  };

  const dragEvent = (e: MouseEvent | WheelEvent) => {
    let movX = 0;
    let movY = 0;
    if (e instanceof WheelEvent) {
      movX = e.deltaX * 2;
      movY = e.deltaY * 2;
    } else {
      movX = e.movementX;
      movY = e.movementY;
    }
    updateSchemaViewTranslate(
      schemaView.translate.x + movX,
      schemaView.translate.y + movY
    );
  };

  const dragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => dragEvent(e);
      const handleMouseUp = () => dragEnd();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const transformation = useMemo(() => {
    return `matrix(${schemaView.scale},0,0,${schemaView.scale},${schemaView.translate.x},${schemaView.translate.y})`;
  }, [schemaView]);

  const transformOrigin = '0 0';

  // SelectionArea handlers
  const onBeforeStart = ({ event, selection }: SelectionEvent) => {
    const element = event?.target as Element;
    if (event && 'button' in event && event.button !== 0) {
      return false;
    } else if (element.closest('.selectable')) {
      return false;
    }
    tableSelected.forEach((el) => {
      el.classList.remove('selected');
    });
    selection.clearSelection();
    setTableSelected(new Set());
  };

  const onStart = () => {
    // Optional: handle start
  };

  const onMove = ({
    store: {
      changed: { added, removed },
    },
  }: SelectionEvent) => {
    const newSelected = new Set(tableSelected);
    for (const el of added) {
      newSelected.add(el);
      el.classList.add('selected');
    }
    for (const el of removed) {
      newSelected.delete(el);
      el.classList.remove('selected');
    }
    setTableSelected(newSelected);
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollEvent(e);
    };

    const screenCanvas = document.getElementById('screen-canvas');
    if (screenCanvas) {
      screenCanvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        screenCanvas.removeEventListener('wheel', handleWheel);
      };
    }
  }, [isDraggingChild, schemaView]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div 
        className={cn(
          "absolute inset-0 transition-all duration-300 ease-in-out"
        )}
      >
        <Helper onChatOpen={() => setIsChatOpen(!isChatOpen)} isChatOpen={isChatOpen} />
        <SelectionArea
          className="container"
          selectables=".selectable"
          onMove={onMove}
          onStart={onStart}
          onBeforeStart={onBeforeStart}
        >
          <div
            id="screen-canvas"
            className="w-full h-screen relative overflow-hidden bg-white dark:bg-dark-900"
            style={{ cursor: isDragging ? 'grabbing' : 'default' }}
            onMouseDown={dragStart}
            onMouseUp={() => setIsDragging(false)}
          >
            <div
              id="canvas"
              style={{ transformOrigin, transform: transformation }}
              className="absolute select-none relative boxes"
            >
              <div id="canvas-children">
                {Object.values(tables).map((table) => (
                  <Table
                    key={table.title}
                    table={table}
                    scale={schemaView.scale}
                    mounted={isMounted}
                    onTableDragging={setIsDraggingChild}
                  />
                ))}
              </div>
            </div>
          </div>
        </SelectionArea>
      </div>
      <ChatSidebar isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
    </div>
  );
}
