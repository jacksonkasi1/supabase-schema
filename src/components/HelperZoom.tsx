'use client';

import { useStore } from '@/lib/store';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HelperZoom() {
  const { schemaView, updateSchemaViewScale } = useStore();

  const updateView = (type: 'plus' | 'minus') => {
    if (type === 'plus') {
      if (schemaView.scale >= 3) return;
      updateSchemaViewScale(schemaView.scale + 0.1);
    } else {
      if (schemaView.scale <= 0.47) return;
      updateSchemaViewScale(schemaView.scale - 0.1);
    }
  };

  return (
    <div className="flex items-center border rounded-md overflow-hidden bg-background">
      <Button
        variant="ghost"
        size="icon"
        title="Zoom out"
        onClick={() => updateView('minus')}
      >
        <Minus size={16} />
      </Button>
      <div className="px-3 text-sm font-medium border-x min-w-[60px] text-center">
        {(schemaView.scale * 100).toFixed(0)}%
      </div>
      <Button
        variant="ghost"
        size="icon"
        title="Zoom in"
        onClick={() => updateView('plus')}
      >
        <Plus size={16} />
      </Button>
    </div>
  );
}
