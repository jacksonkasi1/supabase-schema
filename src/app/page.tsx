'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Helper } from '@/components/Helper';
import { ChatSidebar } from '@/components/ChatSidebar';
import { FlowCanvas } from '@/components/flow/FlowCanvas';
import { ImportSQL } from '@/components/ImportSQL';
import { SearchBar } from '@/components/SearchBar';
import { SchemaFilter } from '@/components/flow/SchemaFilter';
import { Button } from '@/components/ui/button';
import { Upload, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function HomePage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { triggerFocusTable, clearCache, tables } = useStore();

  // Listen for storage events
  useEffect(() => {
    const handleStorageExceeded = (event: Event) => {
      const customEvent = event as CustomEvent;
      const sizeMB = (customEvent.detail.size / 1024 / 1024).toFixed(2);
      toast.error('Storage Limit Exceeded', {
        description: `Schema data (${sizeMB}MB) exceeds 5MB limit. Consider clearing cache.`,
        duration: 5000,
      });
    };

    const handleStorageCleared = () => {
      toast.success('Cache Cleared', {
        description: 'All stored schema data has been removed.',
        duration: 3000,
      });
    };

    window.addEventListener('storage:exceeded', handleStorageExceeded);
    window.addEventListener('storage:cleared', handleStorageCleared);

    return () => {
      window.removeEventListener('storage:exceeded', handleStorageExceeded);
      window.removeEventListener('storage:cleared', handleStorageCleared);
    };
  }, []);

  const handleClearCache = () => {
    if (Object.keys(tables).length > 0) {
      // Confirm if there's data
      const confirmed = window.confirm(
        'Clear all cached data? This will remove all saved schemas and reset the canvas.'
      );
      if (!confirmed) return;
    }

    clearCache();
    // Force reload to clear React state
    window.location.reload();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 transition-all duration-300 ease-in-out"
        )}
      >
        {/* Action buttons - bottom left */}
        <div className="fixed left-5 bottom-5 z-40 flex gap-2">
          <Button
            variant="outline"
            size="default"
            title="Import SQL Schema"
            onClick={() => setIsImportOpen(true)}
            className="shadow-lg"
          >
            <Upload size={20} className="mr-2" />
            Import SQL
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Clear Cache (Remove all cached data)"
            onClick={handleClearCache}
            className="shadow-lg"
          >
            <Trash2 size={20} />
          </Button>
        </div>

        {/* Search Bar */}
        <SearchBar onJumpToTable={triggerFocusTable} />

        {/* Schema Filter */}
        <SchemaFilter />

        <Helper onChatOpen={() => setIsChatOpen(!isChatOpen)} isChatOpen={isChatOpen} />
        <FlowCanvas />
      </div>
      <ChatSidebar isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
      <ImportSQL open={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
}
