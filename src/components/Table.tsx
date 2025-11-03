'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Table as TableType } from '@/lib/types';
import { Connector } from './Connector';
import { createPortal } from 'react-dom';
import { Newspaper } from 'lucide-react';

interface TableProps {
  table: TableType;
  scale: number;
  mounted: boolean;
  onTableDragging: (dragging: boolean) => void;
}

export function Table({ table, scale, mounted, onTableDragging }: TableProps) {
  const { tables, setTableHighlighted, tableSelected, updateTablePosition } = useStore();
  const [isHover, setIsHover] = useState(false);
  const ixRef = useRef(0);
  const iyRef = useRef(0);
  const tablesSelectedRef = useRef<any>({});

  const position = tables[table.title]?.position || { x: 0, y: 0 };

  const dragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    onTableDragging(true);

    const handleDragEvent = (e: MouseEvent) => {
      if (tableSelected.size > 0) {
        tableSelected.forEach((el: any) => {
          const tableId = el.id;
          updateTablePosition(
            tableId,
            (e.clientX - tablesSelectedRef.current[tableId].ix) / scale,
            (e.clientY - tablesSelectedRef.current[tableId].iy) / scale
          );
        });
      } else {
        updateTablePosition(
          table.title,
          (e.clientX - ixRef.current) / scale,
          (e.clientY - iyRef.current) / scale
        );
      }
    };

    const handleDragEnd = () => {
      onTableDragging(false);
      tablesSelectedRef.current = {};
      document.removeEventListener('mousemove', handleDragEvent);
      document.removeEventListener('mouseup', handleDragEnd);
    };

    if (tableSelected.size > 0) {
      tableSelected.forEach((el: any) => {
        const tableId = el.id;
        const currentPos = tables[tableId]?.position || { x: 0, y: 0 };
        tablesSelectedRef.current[tableId] = {
          ix: e.clientX - currentPos.x * scale,
          iy: e.clientY - currentPos.y * scale,
        };
      });
    } else {
      ixRef.current = e.clientX - position.x * scale;
      iyRef.current = e.clientY - position.y * scale;
    }

    document.addEventListener('mousemove', handleDragEvent);
    document.addEventListener('mouseup', handleDragEnd);
  };

  useEffect(() => {
    if (isHover) {
      setTableHighlighted(table.title);
    } else {
      setTableHighlighted('');
    }
  }, [isHover, table.title, setTableHighlighted]);

  return (
    <>
      <div
        id={table.title}
        className="selectable pb-2 absolute z-20 box rounded-md overflow-hidden bg-warm-gray-100 dark:bg-dark-700 border-2 dark:border-dark-border !hover:border-green-500"
        style={{
          top: `${position.y}px`,
          left: `${position.x}px`,
          cursor: 'grab'
        }}
        onMouseDown={dragStart}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      >
        <h5 className="py-2 pb-3 px-2 text-dark-200 dark:text-light-500 bg-warm-gray-200 dark:bg-dark-800 font-medium text-lg text-center border-b-2 dark:border-dark-border">
          {table.is_view && (
            <Newspaper className="inline mb-1px mr-2" size={20} />
          )}
          {table.title}
        </h5>
        {table.columns?.map((col) => (
          <div key={col.title}>
            <div
              className={`py-1 px-4 flex items-center text-dark-100 dark:text-white-800 border-l-3 border-transparent hover:bg-warm-gray-200 dark:hover:bg-dark-600 dark:hover:text-white ${
                col.pk ? 'border-green-500' : ''
              }`}
              id={`${table.title}.${col.title}`}
            >
              <p className="flex-grow">{col.title}</p>
              <p className="ml-10 flex-grow-0 text-sm text-white-900">
                {col.format}
              </p>
            </div>
            {mounted && col.fk && createPortal(
              <Connector
                svg={`svg-${table.title}.${col.title}`}
                id={`${table.title}.${col.title}`}
                target={col.fk}
              />,
              document.getElementById('canvas-children') as HTMLElement
            )}
          </div>
        ))}
      </div>
    </>
  );
}
