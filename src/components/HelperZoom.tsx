'use client';

import { useStore } from '@/lib/store';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export function HelperZoom() {
  const { triggerZoomIn, triggerZoomOut } = useStore();
  const [zoomLevel, setZoomLevel] = useState(100);

  // Listen for zoom changes from ReactFlow
  useEffect(() => {
    const handleZoomChange = (event: CustomEvent) => {
      setZoomLevel(Math.round(event.detail.zoom * 100));
    };

    window.addEventListener('reactflow:zoom', handleZoomChange as EventListener);
    return () => {
      window.removeEventListener('reactflow:zoom', handleZoomChange as EventListener);
    };
  }, []);

  return (
    <div className="flex items-center border rounded-md overflow-hidden bg-background">
      <Button
        variant="ghost"
        size="icon"
        title="Zoom out"
        onClick={triggerZoomOut}
      >
        <Minus size={16} />
      </Button>
      <div className="px-3 text-sm font-medium border-x min-w-[60px] text-center">
        {zoomLevel}%
      </div>
      <Button
        variant="ghost"
        size="icon"
        title="Zoom in"
        onClick={triggerZoomIn}
      >
        <Plus size={16} />
      </Button>
    </div>
  );
}
