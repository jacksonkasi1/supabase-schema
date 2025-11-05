'use client';

import { RelationshipType } from '@/types/flow';
import { RELATIONSHIP_TYPES } from '@/lib/relationship-utils';
import { Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelationshipSelectorProps {
  currentType: RelationshipType;
  onSelect: (type: RelationshipType) => void;
  position: { x: number; y: number };
  onClose: () => void;
  onDelete?: () => void;
}

export function RelationshipSelector({
  currentType,
  onSelect,
  position,
  onClose,
  onDelete,
}: RelationshipSelectorProps) {
  const handleSelect = (type: RelationshipType) => {
    onSelect(type);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop to close on outside click */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Selector dropdown */}
      <div
        className="fixed z-50 bg-white dark:bg-dark-800 rounded-lg shadow-2xl border border-warm-gray-200 dark:border-dark-border overflow-hidden"
        style={{
          left: `${position.x + 10}px`,
          top: `${position.y + 10}px`,
          minWidth: '200px',
        }}
      >
        <div className="px-3 py-1.5 bg-warm-gray-100 dark:bg-dark-700 border-b dark:border-dark-border">
          <h3 className="text-xs font-semibold text-dark-200 dark:text-light-500">
            Relationship Type
          </h3>
        </div>

        <div className="py-1">
          {(Object.keys(RELATIONSHIP_TYPES) as RelationshipType[]).map((type) => {
            const info = RELATIONSHIP_TYPES[type];
            const isSelected = type === currentType;

            return (
              <button
                key={type}
                onClick={() => handleSelect(type)}
                className={cn(
                  'w-full px-2.5 py-1.5 text-left flex items-center justify-between',
                  'hover:bg-warm-gray-100 dark:hover:bg-dark-700',
                  'transition-colors duration-150',
                  isSelected && 'bg-warm-gray-50 dark:bg-dark-750'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: info.color }}
                  >
                    {info.label}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-dark-100 dark:text-white-800">
                      {info.description}
                    </div>
                    <div className="text-[10px] text-white-900 dark:text-white-700">
                      {info.sourceMarker} → {info.targetMarker}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="px-2.5 py-1.5 bg-warm-gray-50 dark:bg-dark-750 border-t dark:border-dark-border flex items-center justify-between gap-2">
          <p className="text-[10px] text-white-900 dark:text-white-700">
            Click to change
          </p>
          {onDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
              title="Delete relationship"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  );
}
