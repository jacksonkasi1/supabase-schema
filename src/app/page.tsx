'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Helper } from '@/components/Helper';
import { ChatSidebar } from '@/components/ChatSidebar';
import { FlowCanvas } from '@/components/flow/FlowCanvas';
import { ImportSQL } from '@/components/ImportSQL';
import { SearchBar } from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { triggerFocusTable } = useStore();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 transition-all duration-300 ease-in-out"
        )}
      >
        {/* Import SQL button - bottom left */}
        <div className="fixed left-5 bottom-5 z-40">
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
        </div>

        {/* Search Bar */}
        <SearchBar onJumpToTable={triggerFocusTable} />

        <Helper onChatOpen={() => setIsChatOpen(!isChatOpen)} isChatOpen={isChatOpen} />
        <FlowCanvas />
      </div>
      <ChatSidebar isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
      <ImportSQL open={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
}
