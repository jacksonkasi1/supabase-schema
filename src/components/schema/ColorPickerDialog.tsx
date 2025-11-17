'use client';

import { useStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const DRAWSQL_COLORS = [
  '#EC4899', // pink
  '#A855F7', // purple
  '#8B5CF6', // violet
  '#6366F1', // indigo
  '#3B82F6', // blue
  '#0EA5E9', // sky
  '#06B6D4', // cyan
  '#14B8A6', // teal
  '#10B981', // emerald
  '#22C55E', // green
  '#84CC16', // lime
  '#EAB308', // yellow
  '#F59E0B', // amber
  '#F97316', // orange
  '#EF4444', // red
];

interface ColorPickerColorPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  currentColor?: string;
}

export function ColorPickerColorPicker({
  open,
  onOpenChange,
  tableId,
  currentColor,
}: ColorPickerColorPickerProps) {
  const { updateTableColor } = useStore();

  const handleColorSelect = (color: string) => {
    updateTableColor(tableId, color);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Choose Table Color</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-3 py-4">
          {DRAWSQL_COLORS.map((color) => (
            <button
              key={color}
              className={cn(
                'h-12 w-12 rounded-lg transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative',
                currentColor === color && 'ring-2 ring-offset-2 ring-offset-background'
              )}
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
            >
              {currentColor === color && (
                <Check className="h-5 w-5 absolute inset-0 m-auto text-white drop-shadow-lg" />
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
