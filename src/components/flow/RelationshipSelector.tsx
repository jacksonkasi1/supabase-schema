'use client';

import { RelationshipType } from '@/types/flow';
import { RELATIONSHIP_TYPES } from '@/lib/relationship-utils';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelationshipSelectorProps {
  currentType: RelationshipType;
  onSelect: (type: RelationshipType) => void;
  position: { x: number; y: number };
  onClose: () => void;
}

export function RelationshipSelector({
  currentType,
  onSelect,
  position,
  onClose,
}: RelationshipSelectorProps) {
  const handleSelect = (type: RelationshipType) => {
    onSelect(type);
    onClose();
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
        className="fixed z-50 bg-white dark:bg-dark-800 rounded-lg shadow-xl border-2 border-warm-gray-300 dark:border-dark-border overflow-hidden"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          minWidth: '220px',
        }}
      >
        <div className="px-3 py-2 bg-warm-gray-100 dark:bg-dark-700 border-b dark:border-dark-border">
          <h3 className="text-sm font-semibold text-dark-200 dark:text-light-500">
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
                  'w-full px-3 py-2 text-left flex items-center justify-between',
                  'hover:bg-warm-gray-100 dark:hover:bg-dark-700',
                  'transition-colors duration-150',
                  isSelected && 'bg-warm-gray-50 dark:bg-dark-750'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: info.color }}
                  >
                    {info.label}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-dark-100 dark:text-white-800">
                      {info.description}
                    </div>
                    <div className="text-xs text-white-900 dark:text-white-700">
                      {info.sourceMarker} → {info.targetMarker}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="px-3 py-2 bg-warm-gray-50 dark:bg-dark-750 border-t dark:border-dark-border">
          <p className="text-xs text-white-900 dark:text-white-700">
            Click to change relationship type
          </p>
        </div>
      </div>
    </>
  );
}
